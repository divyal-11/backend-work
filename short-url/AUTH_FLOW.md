# 🔐 Complete Authentication & Authorization Flow Documentation

This document explains the complete authentication and authorization architecture implemented in the **Short URL** application, detailing every file, interaction, data structure, and request lifecycle.

> **Auth Approach**: JWT (JSON Web Token) — Stateless authentication. No server-side session store needed. The token itself carries the user's identity.

---

## 🗺️ 1. High-Level System Architecture & File Connections

```mermaid
graph TD
    Browser([🌐 Client / Browser])

    subgraph Server ["🖥️ Express Server (index.js)"]
        CP["🍪 cookie-parser Middleware"]
        AuthMid["🛡️ Middleware (middleware/auth.js)<br/>• restrictToLoggedinUserOnly<br/>• checkAuth"]
        
        subgraph Routers ["🛣️ Routers"]
            StaticR["routes/staticRouter.js<br/>GET /<br/>GET /signup<br/>GET /login"]
            UserR["routes/user.js<br/>POST /<br/>POST /login"]
            UrlR["routes/url.js<br/>POST /<br/>GET /analytics/:shortUrl"]
        end

        subgraph Controllers ["⚙️ Controllers"]
            UserCtrl["controllers/user.js<br/>• handleUserSignUp<br/>• handleUserLogin"]
            UrlCtrl["controllers/url.js<br/>• handleGenerateNewShortUrl<br/>• handleGetAnalytics"]
        end

        subgraph Services ["🔑 JWT Service (service/auth.js)"]
            JWTService["setUser(user) → jwt.sign({ _id, email }, SECRET_KEY)<br/>getUser(token) → jwt.verify(token, SECRET_KEY)"]
        end
    end

    subgraph Database ["🗄️ MongoDB Database"]
        UserModel[("models/user.js<br/>users collection")]
        UrlModel[("models/url.js<br/>urls collection<br/>(createdBy -> users)")]
    end

    subgraph Views ["🎨 EJS Views"]
        SignupEJS["views/signup.ejs"]
        LoginEJS["views/login.ejs"]
        HomeEJS["views/home.ejs"]
    end

    %% Connections
    Browser -->|HTTP Requests| CP
    CP --> AuthMid
    AuthMid -.->|jwt.verify token from cookie| JWTService

    AuthMid --> StaticR
    AuthMid --> UserR
    AuthMid --> UrlR

    StaticR --> HomeEJS
    StaticR --> SignupEJS
    StaticR --> LoginEJS
    StaticR --> UrlModel

    UserR --> UserCtrl
    UserCtrl --> UserModel
    UserCtrl -->|jwt.sign → generates token| JWTService
    UserCtrl -->|Set-Cookie: token=JWT| Browser

    UrlR --> UrlCtrl
    UrlCtrl --> UrlModel
    UrlCtrl --> HomeEJS
```

---

## 🔄 2. Stateless vs Stateful Auth — What Changed

| Feature | Old (Map-based / Stateful) | New (JWT / Stateless) |
| :--- | :--- | :--- |
| **Session Store** | `new Map()` in `service/auth.js` | No server store needed — token is self-contained |
| **Cookie Value** | Random UUID (`uuidv4()`) | JWT string (`eyJhbGci...`) |
| **Cookie Name** | `uid` | `token` |
| **setUser()** | `setUser(sessionId, user)` — saves to Map | `setUser(user)` — returns signed JWT |
| **getUser()** | `getUser(id)` — looks up from Map | `getUser(token)` — decodes & verifies JWT |
| **Server Restart** | ❌ All sessions lost (Map clears) | ✅ Sessions survive (token is on client) |
| **Scalability** | ❌ Sessions tied to single server | ✅ Any server can verify the token |

### How JWT Works (Simplified):

```
┌─────────────────────────────────────────────────────────┐
│                    JWT Token Structure                    │
│                                                          │
│  eyJhbGciOiJIUzI1NiJ9.                    ← Header      │
│  eyJfaWQiOiI2YTkzMzhkZmYyNmJmYTk0MWY4   ← Payload     │
│  Yzk5NmMiLCJlbWFpbCI6ImRpdkBleGFtcGxl    (_id, email)  │
│  LmNvbSJ9.                                              │
│  sG8x2kR7mN3pQz...                        ← Signature   │
│                                            (SECRET_KEY)  │
└─────────────────────────────────────────────────────────┘

jwt.sign({ _id, email }, SECRET_KEY)  →  Creates the token
jwt.verify(token, SECRET_KEY)         →  Decodes & validates it
```

---

## 🔄 3. Detailed Flows Step-by-Step

### A. Signup & Auto-Login Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User / Browser
    participant Index as index.js
    participant Route as routes/user.js
    participant Ctrl as controllers/user.js
    participant DB as MongoDB (User Model)
    participant JWT as service/auth.js

    User->>Index: GET /signup
    Index-->>User: Renders views/signup.ejs

    User->>Index: POST /user (name, email, password)
    Index->>Route: Matches router.post('/', handleUserSignUp)
    Route->>Ctrl: Executes handleUserSignUp(req, res)
    
    Ctrl->>DB: User.create({ name, email, password })
    DB-->>Ctrl: Returns saved user document (_id, name, email, createdAt...)

    Ctrl->>JWT: setUser(user)
    Note over JWT: jwt.sign({ _id: user._id, email: user.email }, SECRET_KEY)
    JWT-->>Ctrl: Returns JWT token string

    Ctrl->>User: Set-Cookie: token=eyJhbGci... + 302 Redirect to /
    User->>Index: GET / (automatically brings Cookie: token=eyJhbGci...)
    Index-->>User: Renders views/home.ejs with user's links
```

---

### B. Login Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User / Browser
    participant Index as index.js
    participant Route as routes/user.js
    participant Ctrl as controllers/user.js
    participant DB as MongoDB (User Model)
    participant JWT as service/auth.js

    User->>Index: GET /login
    Index-->>User: Renders views/login.ejs

    User->>Index: POST /user/login (email, password)
    Index->>Route: Matches router.post('/login', handleUserLogin)
    Route->>Ctrl: Executes handleUserLogin(req, res)

    Ctrl->>DB: User.findOne({ email, password })
    
    alt Invalid Credentials (User is null)
        DB-->>Ctrl: null
        Ctrl-->>User: 200 OK -> Renders views/login.ejs with { error: "Invalid Creds" }
    else Valid Credentials (User found)
        DB-->>Ctrl: user document
        Ctrl->>JWT: setUser(user)
        Note over JWT: jwt.sign({ _id, email }, SECRET_KEY)
        JWT-->>Ctrl: Returns JWT token string
        Ctrl->>User: Set-Cookie: token=eyJhbGci... + 302 Redirect to /
    end
```

---

### C. Dashboard Request Flow (`GET /` - Protected with `checkAuth`)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User / Browser
    participant Index as index.js
    participant Mid as middleware/auth.js (checkAuth)
    participant JWT as service/auth.js
    participant Router as routes/staticRouter.js
    participant DB as MongoDB (URL Model)

    User->>Index: GET / (with Cookie: token=eyJhbGci...)
    Index->>Mid: Runs checkAuth(req, res, next)
    Mid->>JWT: getUser(req.cookies.token)
    Note over JWT: jwt.verify(token, SECRET_KEY)<br/>wrapped in try-catch

    alt No Cookie or Invalid/Expired Token
        JWT-->>Mid: null (caught by try-catch)
        Mid->>Mid: req.user = null
        Mid->>Router: next()
        Router->>User: if (!req.user) 302 Redirect to /login
    else Valid JWT Token
        JWT-->>Mid: { _id: "6a93...", email: "div@example.com" }
        Mid->>Mid: req.user = decoded payload
        Mid->>Router: next()
        Router->>DB: URL.find({ createdBy: req.user._id })
        DB-->>Router: Array of URLs belonging ONLY to this user
        Router-->>User: Renders views/home.ejs with { urls: allUrls }
    end
```

---

### D. URL Creation Flow (`POST /url` - Protected with `restrictToLoggedinUserOnly`)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User / Browser
    participant Index as index.js
    participant Mid as middleware/auth.js (restrictToLoggedinUserOnly)
    participant JWT as service/auth.js
    participant Ctrl as controllers/url.js
    participant DB as MongoDB (URL Model)

    User->>Index: POST /url { url: "https://example.com" } (with Cookie: token=eyJhbGci...)
    Index->>Mid: Runs restrictToLoggedinUserOnly
    Mid->>JWT: getUser(req.cookies.token)
    
    alt Not Logged In (no token or invalid JWT)
        JWT-->>Mid: null
        Mid-->>User: 302 Redirect to /login
    else Logged In (valid JWT)
        JWT-->>Mid: { _id, email }
        Mid->>Mid: req.user = decoded payload
        Mid->>Ctrl: next()
        Ctrl->>Ctrl: shortId = nanoid(8)
        Ctrl->>DB: URL.create({ redirectedUrl, shortUrl, createdBy: req.user._id, visitHistory: [] })
        DB-->>Ctrl: Created URL record
        Ctrl-->>User: Renders views/home.ejs with { id: shortId }
    end
```

---

### E. Public Short URL Redirection (`GET /url/:shortUrl`)

```mermaid
sequenceDiagram
    autonumber
    actor AnyUser as 🌍 Any Public User / Visitor
    participant Index as index.js (app.get('/url/:shortUrl'))
    participant DB as MongoDB (URL Model)
    participant Dest as 🌐 Target Destination (e.g. github.com)

    AnyUser->>Index: GET /url/POZjZRhX (No login/cookie required!)
    Index->>DB: URL.findOneAndUpdate({ shortUrl: "POZjZRhX" }, { $push: { visitHistory: { timestamp: Date.now() } } })
    
    alt URL ID not in DB
        DB-->>Index: null
        Index-->>AnyUser: 404 "URL not found"
    else URL Found
        DB-->>Index: { redirectedUrl: "https://github.com", ... }
        Index-->>AnyUser: 302 Redirect Location: "https://github.com"
        AnyUser->>Dest: Navigates to target website
    end
```

---

## 📁 4. File-by-File Breakdown & Inner Mechanics

### 1. `models/user.js`
- **Purpose**: Defines the User schema in MongoDB.
- **Fields**:
  - `name` (String, required)
  - `email` (String, required, `unique: true`) — ensures duplicate accounts cannot be made with the same email.
  - `password` (String, required) — stored credential.
  - `{ timestamps: true }` — automatically tracks `createdAt` and `updatedAt`.

### 2. `service/auth.js` — JWT Token Service
- **Purpose**: Stateless JWT-based authentication. No server-side storage needed.
- **Inner Mechanics**:
  - **`setUser(user)`**: Takes the user document, extracts `{ _id, email }`, and signs a JWT using `jwt.sign(payload, SECRET_KEY)`. Returns the token string.
  - **`getUser(token)`**: Takes the JWT token string from the cookie, runs `jwt.verify(token, SECRET_KEY)` inside a `try-catch`. Returns the decoded payload `{ _id, email }` on success, or `null` on failure (expired/malformed/tampered token).
  - **`SECRET_KEY`**: The secret used to sign and verify tokens. If this key changes, all existing tokens become invalid.

### 3. `controllers/user.js`
- **`handleUserSignUp`**:
  - Extracts `{ name, email, password }` from `req.body`.
  - Creates user in MongoDB.
  - Generates JWT token via `const token = setUser(user)`.
  - Attaches HTTP response cookie `res.cookie("token", token)`.
  - Redirects to `/`.
- **`handleUserLogin`**:
  - Searches DB: `User.findOne({ email, password })`.
  - If invalid: renders `login.ejs` with `{ error: "Invalid Creds" }`.
  - If valid: generates JWT token via `const token = setUser(user)`, sets `token` cookie, and redirects to `/`.

### 4. `middleware/auth.js`
- **`restrictToLoggedinUserOnly` (Strict Guard)**:
  - Reads `req.cookies?.token`.
  - Verifies JWT via `getUser(token)`.
  - If missing/invalid → immediately redirects to `/login`.
  - If valid → assigns `req.user = decoded payload` and calls `next()`.
  - *Applied to*: `POST /url` (only logged-in users can generate links).
- **`checkAuth` (Soft Guard)**:
  - Reads `req.cookies?.token`.
  - Verifies JWT via `getUser(token)`.
  - Attaches `req.user = decoded payload` (can be `null` if guest).
  - **Always calls `next()` without blocking**.
  - *Applied to*: `app.use("/", checkAuth, staticRoute)` so `/login` and `/signup` can open freely, while `/` can conditionally check `req.user`.

### 5. `models/url.js`
- **`createdBy` Reference**:
  ```javascript
  createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users"
  }
  ```
  Links each shortened URL to the `_id` of the user who generated it.

### 6. `routes/staticRouter.js`
- **`GET /`**:
  - Checks `if (!req.user) return res.redirect("/login")`.
  - Queries `URL.find({ createdBy: req.user._id })` so users only see their own URLs.
  - Renders `home.ejs`.
- **`GET /signup`**: Renders `signup.ejs`.
- **`GET /login`**: Renders `login.ejs`.

### 7. `index.js` (Master Assembly)
- **Middleware Order**:
  1. `express.json()` & `express.urlencoded({ extended: false })` (Parses JSON & form bodies into `req.body`).
  2. `cookieParser()` (Parses HTTP Cookie headers into `req.cookies`).
  3. `app.get('/url/:shortUrl', ...)` (Public redirect placed **before** auth middleware).
  4. `app.use("/url", restrictToLoggedinUserOnly, urlRoute)`.
  5. `app.use("/user", userRoute)`.
  6. `app.use("/", checkAuth, staticRoute)`.
