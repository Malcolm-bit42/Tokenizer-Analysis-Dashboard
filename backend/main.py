from fastapi import FastAPI
from routers.tokenizers import router as tokenizers
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.include_router(tokenizers)

# This is there to fix CORS errors
origins = [
    "http://localhost:5173", 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # List of allowed domains
    allow_credentials=True,         # Allow cookies/auth headers
    allow_methods=["*"],            # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],            # Allow all headers
) 
