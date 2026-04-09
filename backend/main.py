import os
import re
import json
import sqlglot
from sqlglot import exp
from cachetools import TTLCache, cached
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import boto3
from google import genai
from dotenv import load_dotenv

import database

load_dotenv()
database.init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

class QueryRequest(BaseModel):
    query: str
    database: str = "default"
    credentials: Optional[Dict[str, str]] = None
    outputLocation: str = "s3://athena-query-results-bucket/"
    region: str = "us-east-1"

class OptimizeRequest(BaseModel):
    query: str

class ChatMessage(BaseModel):
    role: str
    content: str
	
class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

@app.post("/run-query")
def run_query(req: QueryRequest):
    # If credentials are provided, use them. Otherwise rely on local boto3 config
    try:
        if req.credentials:
            athena = boto3.client(
                'athena',
                region_name=req.region,
                aws_access_key_id=req.credentials.get('accessKeyId'),
                aws_secret_access_key=req.credentials.get('secretAccessKey'),
                aws_session_token=req.credentials.get('sessionToken')
            )
        else:
            athena = boto3.client('athena', region_name=req.region)

        # Execute query
        start_response = athena.start_query_execution(
            QueryString=req.query,
            QueryExecutionContext={'Database': req.database},
            ResultConfiguration={'OutputLocation': req.outputLocation}
        )
        exec_id = start_response['QueryExecutionId']

        # Wait for completion
        import time
        while True:
            status_res = athena.get_query_execution(QueryExecutionId=exec_id)
            status = status_res['QueryExecution']['Status']['State']
            if status in ['SUCCEEDED', 'FAILED', 'CANCELLED']:
                break
            time.sleep(1)

        if status == 'FAILED':
            reason = status_res['QueryExecution']['Status'].get('StateChangeReason', 'Unknown Error')
            database.save_query(req.query, 0, 0, 0, "FAILED")
            raise HTTPException(status_code=400, detail=f"Query failed: {reason}")
        elif status == 'CANCELLED':
            database.save_query(req.query, 0, 0, 0, "CANCELLED")
            raise HTTPException(status_code=400, detail="Query was cancelled")

        # Get metrics
        stats = status_res['QueryExecution']['Statistics']
        exec_time = stats.get('EngineExecutionTimeInMillis', 0)
        data_scanned = stats.get('DataScannedInBytes', 0)
        tb_scanned = data_scanned / (1024 ** 4)
        cost = max(tb_scanned * 5, 0)

        # Save history
        database.save_query(req.query, exec_time, data_scanned, cost, "SUCCEEDED")

        # Get initial results rows
        results_res = athena.get_query_results(QueryExecutionId=exec_id)
        columns = [col['Name'] for col in results_res['ResultSet']['ResultSetMetadata']['ColumnInfo']]
        rows = []
        for row in results_res['ResultSet']['Rows'][1:]:
            rows.append([d.get('VarCharValue', '') for d in row['Data']])

        return {
            "queryExecutionId": exec_id,
            "state": status,
            "executionTimeMs": exec_time,
            "dataScannedBytes": data_scanned,
            "cost": cost,
            "columns": columns,
            "rows": rows
        }

    except Exception as e:
        # Save failure to history
        database.save_query(req.query, 0, 0, 0, "ERROR")
        raise HTTPException(status_code=500, detail=str(e))

# Set up caches
query_cache = TTLCache(maxsize=100, ttl=3600)
chat_cache = TTLCache(maxsize=100, ttl=3600)

@app.get("/get-history")
def get_history():
    history = database.get_recent_queries()
    return {"history": history}

def analyze_sql_rules(query: str):
    issues = []
    opt_query = query
    original_scanned_gb = 50.0
    opt_scanned_gb = 50.0
    original_time = 15.0
    opt_time = 15.0
    
    try:
        parsed = sqlglot.parse_one(query, dialect="presto")
        
        # Check SELECT *
        if any(parsed.find_all(exp.Star)):
            issues.append("Avoid SELECT *. Specify only the columns you need to significantly reduce data scanned.")
            opt_scanned_gb *= 0.5
            
        # Check LIMIT
        # If it's a select statement
        if isinstance(parsed, exp.Select):
            limit_exp = parsed.args.get("limit")
            if not limit_exp:
                issues.append("Consider adding a LIMIT clause to restrict result size if you are exploring data.")
                opt_time *= 0.7  # Limit helps execution time
                opt_scanned_gb *= 0.9 # Minor heuristic scan reduction
                # Suggest adding LIMIT 100
                opt_query = f"{query.rstrip(';')} LIMIT 100;"
                
            # Check WHERE for partitions
            where_exp = parsed.args.get("where")
            if not where_exp:
                issues.append("Missing WHERE clause. Always use partition keys (e.g., year, month, date) to drastically reduce data scanned.")
                opt_scanned_gb *= 0.2
                opt_time *= 0.3
            else:
                where_str = str(where_exp).lower()
                common_partitions = ['year', 'month', 'day', 'date', 'dt']
                if not any(p in where_str for p in common_partitions):
                    issues.append("Ensure your WHERE clause includes partition keys to avoid full table scans.")
                    opt_scanned_gb *= 0.5
        
        # Add basic formatting
        try:
            opt_query = parsed.sql(dialect="presto", pretty=True)
            if not isinstance(parsed, exp.Select) or not parsed.args.get("limit"):
                opt_query = f"{opt_query}\nLIMIT 100"
        except:
            pass

    except sqlglot.errors.ParseError:
        issues.append("Could not fully parse SQL syntax. Ensure it follows Presto/Athena grammar.")

    # Always ensure 5 suggestions by padding generic Presto suggestions if needed
    generic_suggestions = [
        "Use columnar formats like Parquet or ORC to optimize scan costs.",
        "Use appropriate data types (e.g., INT instead of STRING for numbers).",
        "Enable partition projection if querying highly partitioned S3 buckets.",
        "Use CTAS (Create Table As) for intermediate aggregations.",
        "Push down predicates as much as possible before JOINs."
    ]
    
    for gs in generic_suggestions:
        if len(issues) >= 5:
            break
        if not any(gs[:20] in i for i in issues):
            issues.append(gs)
            
    # Calculate costs
    original_cost = (original_scanned_gb / 1024) * 5
    opt_cost = (opt_scanned_gb / 1024) * 5
    
    return {
        "originalEstimate": {
            "dataScannedGB": round(original_scanned_gb, 2),
            "costUSD": round(original_cost, 4),
            "estimatedTimeSeconds": round(original_time, 1)
        },
        "optimizedEstimate": {
            "dataScannedGB": round(opt_scanned_gb, 2),
            "costUSD": round(opt_cost, 4),
            "estimatedTimeSeconds": round(opt_time, 1)
        },
        "optimizedQuery": opt_query,
        "suggestions": issues
    }

@app.post("/optimize-query")
def optimize_query(req: OptimizeRequest):
    cache_key = req.query.strip().lower()
    if cache_key in query_cache:
        return query_cache[cache_key]

    # Rule-based analysis first
    rule_results = analyze_sql_rules(req.query)
    
    # Optionally enrich with Gemini if available, but primarily rely on rules to save API
    # We will just return rule results to be fully guaranteed and deterministic
    if client and len(rule_results["suggestions"]) < 3: # Only call Gemini if rules failed to find much
        try:
            prompt = f"Optimize this Athena SQL query. Return JSON with 'optimizedQuery' and 'suggestions' (array of strings):\n{req.query}"
            response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
            text = response.text.replace('```json', '').replace('```', '').strip()
            data = json.loads(text)
            
            rule_results["optimizedQuery"] = data.get("optimizedQuery", rule_results["optimizedQuery"])
            # Merge suggestions uniquely
            for s in data.get("suggestions", []):
                if s not in rule_results["suggestions"]:
                    rule_results["suggestions"].append(s)
        except:
            pass

    rule_results["originalQuery"] = req.query
    query_cache[cache_key] = rule_results
    return rule_results

@app.post("/chat")
def chat(req: ChatRequest):
    cache_key = str(req.message) + str(len(req.history))
    if cache_key in chat_cache:
        return {"response": chat_cache[cache_key]}

    msg = req.message.lower()
    
    # Rule-based fast path
    if "cost" in msg or "pricing" in msg:
        ans = "Athena charges $5.00 per TB of data scanned. You only pay for the columns read, so using Parquet/ORC and partition filters dramatically lowers costs."
        chat_cache[cache_key] = ans
        return {"response": ans}
    if "partition" in msg:
        ans = "Partitioning stores your data in virtual folders (e.g., year=2023/month=10). Athena only scans partitions matched in your WHERE clause, saving huge amounts of time and money."
        chat_cache[cache_key] = ans
        return {"response": ans}
    
    if not client:
        return {"response": "Rule-based Agent: Gemini API is missing, but I can still help with general Athena questions! Just ask about cost, partitioning, or formats."}

    context = "You are an Amazon Athena SQL expert. Provide helpful, accurate, and concise guidance."
    try:
        chat_session = client.chats.create(model="gemini-2.5-flash")
        history_text = ""
        for m in req.history[-10:]:
            history_text += f"\n{m.role}: {m.content}"
        
        full_prompt = f"{context}\n\nChat History:{history_text}\n\nUser: {req.message}"
        response = chat_session.send_message(full_prompt)
        chat_cache[cache_key] = response.text
        return {"response": response.text}
    except Exception as e:
        # Fallback to rules on error
        fallback = "I'm having trouble connecting to the AI, but as a rule of thumb for Athena: Avoid SELECT *, use Parquet format, use partitions, and limit data scanned!"
        return {"response": fallback}
