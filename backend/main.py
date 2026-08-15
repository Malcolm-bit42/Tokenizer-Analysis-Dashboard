from fastapi import FastAPI
from routers.tokenizers import router as tokenizers

app = FastAPI()

app.include_router(tokenizers)


@app.get("/")
def read_root():
    return {"Hello": "World"} 
