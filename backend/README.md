# FarmVerse Backend

This is the backend server for the FarmVerse project, a smart farm management and visualization platform. It is a Node.js application built with Express.js and PostgreSQL, providing a RESTful API for user authentication, data management, and other core functionalities.

## Features

-   **User Authentication**: Secure user registration and login using JSON Web Tokens (JWT).
-   **Password Hashing**: Passwords are securely hashed using `bcryptjs` before being stored.
-   **RESTful API**: A clean and organized API structure for managing users, farms, and plants.
-   **Role-Based Access Control**: Differentiates between standard `user` roles and `admin` roles for accessing protected endpoints.
-   **Centralized Configuration**: Environment variables are managed in a `.env` file for easy setup across different environments.
-   **Structured Project Layout**: Code is organized by layers (Presentation, Business, Data) for maintainability.

## Tech Stack

-   **Runtime**: [Node.js](https://nodejs.org/)
-   **Framework**: [Express.js](https://expressjs.com/)
-   **Database**: [PostgreSQL](https://www.postgresql.org/)
-   **Authentication**: [JSON Web Tokens (JWT)](https://jwt.io/)
-   **Password Hashing**: [bcrypt.js](https://github.com/dcodeIO/bcrypt.js)
-   **Database Client**: [node-postgres (pg)](https://node-postgres.com/)
-   **Development Server**: [Nodemon](https://nodemon.io/)

---

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Make sure you have the following software installed on your system:

-   **Git**: For cloning the repository.
-   **Node.js**: Version 18.x or later is recommended.
-   **PostgreSQL**: The database server.

### Installation & Database Setup

1.  **Clone the repository**
    ```bash
    git clone <your-repository-url>
    cd TeamProject_SmartFarm/backend
    ```

2.  **Install NPM packages**
    ```bash
    npm install
    ```

3.  **Set up the PostgreSQL Database**
    You need to create a database and a user for the application. The simplest method is to use your local system user.

    a. **Find your system username:**
    ```bash
    whoami
    ```
    (Let's assume your username is `myuser`)

    b. **Create the database:**
    ```bash
    createdb farmverse
    ```

    c. **Create the database tables:**
    This command will execute the `schema.sql` file to set up all the necessary tables.
    ```bash
    psql farmverse -f database/schema.sql
    ```

4.  **Configure Environment Variables**
    Create a `.env` file in the `backend` directory. Copy the contents of the `.env.example` below into it and **update the `DB_USER` value**.

    ````
    # .env

    # Database Configuration
    # IMPORTANT: Replace 'myuser' with your actual system username.
    # Leave DB_PASSWORD blank if you don't have a password for your local user.
    DB_USER=myuser
    DB_PASSWORD=
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=farmverse

    # Server Configuration
    # We use 5001 to avoid conflicts with macOS AirPlay on port 5000.
    PORT=5001
    NODE_ENV=development

    # JWT Secrets (replace with your own long, random strings)
    JWT_SECRET=your_super_secret_key_for_jwt_tokens
    JWT_EXPIRES_IN=24h
    ````

### Running the Application

Once the setup is complete, you can start the development server.

```bash
npm run dev
```

The server will start, and you should see the following output in your terminal:

```
[nodemon] starting `node src/server.js`
✅ Database connected...
🚀 Server running on http://localhost:5001
```

The backend is now running and ready to accept API requests.

---

## API Endpoints

Here is a list of the available API endpoints.

### Authentication

-   **`POST /api/users/register`**
    -   Registers a new user.
    -   **Body**: `{ "name": "string", "email": "string", "password": "string" }`
    -   **Response**: `201 Created` with a success message.

-   **`POST /api/users/login`**
    -   Logs in a user.
    -   **Body**: `{ "email": "string", "password": "string" }`
    -   **Response**: `200 OK` with a JWT token and user information.

### Users (Protected)

-   **`GET /api/users/profile`**
    -   Gets the profile information of the currently logged-in user.
    -   **Requires**: `Authorization: Bearer <token>` header.
    -   **Response**: `200 OK` with the user's decoded token payload.

### Admin (Admin-Only)

-   **`GET /api/users/`**
    -   Retrieves a list of all users in the database.
    -   **Requires**: `Authorization: Bearer <admin_token>` header. The user associated with the token must have the `admin` role.
    -   **Response**: `200 OK` with an array of user objects (passwords excluded).