# School Management System API

This repository implements a **School Management System API**, enabling management of schools, classrooms, and students. Built with modular architecture and Dockerized for consistent deployments.

---

## Features

### Architecture

- RESTful API using JavaScript.
- Role-Based Access Control (RBAC):
  - **Superadmin**: Full access.
  - **School Admin**: School-specific access.
- MongoDB for data storage and Redis for caching.
- JWT authentication for secure access.

### Core Entities

1. **Schools**: CRUD operations by Superadmins.
2. **Classrooms**: Managed by School Admins.
3. **Students**: Enrollment and profile management by School Admins.

### Technical Highlights

- Input validation and error handling with HTTP status codes.
- Secure database schema design.
- API rate limiting and adherence to RESTful best practices.

---

## Dockerized Setup

### **Docker Compose**

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5111:5111" # USER_PORT
      - "5222:5222" # ADMIN_PORT
    environment:
      SERVICE_NAME: school-management
      ENV: development
      USER_PORT: 5111
      ADMIN_PORT: 5222
      MONGO_URI: mongodb://mongo:27017/school-management
      REDIS_URI: redis://redis:6379
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:5
    container_name: mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:6
    container_name: redis
    ports:
      - "6379:6379"

volumes:
  mongo_data:
```
