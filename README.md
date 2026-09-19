# **Tad Capstone**
A web tool that evaluates and compares subword tokenizers across eight languages. 

## **Getting Started**

### **Prerequisites**

Before running the project, make sure you have:

* **[Docker Desktop](https://docs.docker.com/desktop/)** installed and running.
* A Unix-based terminal (I've seen some bloke use docker on powershell, so maybe unix based is not needed), such as:

  * macOS Terminal
  * Linux terminal
  * WSL/bash/gitbash on Windows

Docker Desktop includes the Docker CLI, so no additional Docker installation is required.

## Running the Application

### 1. Build the Docker Images

From the project root, run:

```bash
docker compose build
```

### 2. Start the Application

To start both the **frontend** and **backend** (and their buddy, the **precompute cronjob**) services, run:

```bash
docker compose up -d
```

Alternatively, you could perform the build and start in a single command:
```bash
docker compose up -d --build
```

The `-d` flag runs the services in the background. If you'd like to see the container logs on your console, ommit the `-d` flag.

### **3. View the running application**
Once the build and start up is complete, you can view the running app on: `http://localhost:5173`

### **Running Individual Services**

You can also start a specific service:

```bash
docker compose up backend --build
```

or:

```bash
docker compose up frontend --build
```

## **Running Individual Files**

### **Python**

To run a specific Python file inside the backend container:

```bash
docker compose run --rm backend file.py
```

More generally:

```bash
docker compose run --rm <service_name> file.py
```

### **JavaScript**

To run a JavaScript file using Node.js:

```bash
docker compose run --rm <service_name> node file.js
```

### **TypeScript (For Real Gs)**
If you're a real G, like me, and you want to use **Typescript** instead of **JavaScript**, transpile using:

```bash
docker compose run --rm <service_name> tsc file.ts # or npx tsc file.ts
```

Then run the transpiled code using:

```bash
   docker compose run --rm <service_name> node file.js
```


## **Useful Commands**

Stop the running services:

```bash
docker compose down
```

View service logs:

```bash
docker compose logs
```

View logs for a specific service:

```bash
docker compose logs backend
```

Rebuild the images after making changes to the Docker configuration or dependencies:

```bash
docker compose build
```
