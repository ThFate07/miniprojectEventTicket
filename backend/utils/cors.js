const normalizeOrigin = (origin) => origin?.replace(/\/$/, "");

const defaultOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
];

const configuredOrigins = [process.env.FRONTEND_URL, process.env.CLIENT_URL]
    .flatMap((value) => (value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins].map(normalizeOrigin).filter(Boolean))];

const isOriginAllowed = (origin) => {
    if (!origin) {
        return true;
    }

    return allowedOrigins.includes(normalizeOrigin(origin));
};

const corsOrigin = (origin, callback) => {
    if (isOriginAllowed(origin)) {
        return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
};

const corsOptions = {
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"]
};

export { allowedOrigins, corsOptions, isOriginAllowed };