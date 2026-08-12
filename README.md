# Tad Capstone

## Getting Started

### Prerequisites

Before running the project, make sure you have:

* [Docker Desktop](https://docs.docker.com/desktop/) installed and running.
* A Unix-based terminal, such as:

  * macOS Terminal
  * Linux terminal
  * WSL on Windows

Docker Desktop includes the Docker CLI, so no additional Docker installation is required.

## Running the Application

### 1. Build the Docker Images

From the project root, run:

```bash
docker compose build
```

### 2. Start the Application

To start both the frontend and backend services:

```bash
docker compose up -d
```

The `-d` flag runs the services in the background.

### Running Individual Services

You can also start a specific service:

```bash
docker compose up backend
```

or:

```bash
docker compose up frontend
```

## Running Individual Files

### Python

To run a specific Python file inside the backend container:

```bash
docker compose run --rm backend file.py
```

More generally:

```bash
docker compose run --rm <service_name> file.py
```

### JavaScript

To run a JavaScript file using Node.js:

```bash
docker compose run --rm <service_name> node file.js
```

## Useful Commands

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
