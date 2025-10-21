# KDA Achievement Showcase (local)

This small project contains a static front-end and a minimal Node/Express server to accept image uploads for demo purposes.

How to run locally:

1. Install dependencies (Node.js 16+ recommended):

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open http://localhost:3000 in your browser. Use the upload control on the students section to select and upload an image. Uploaded files are saved to the `uploads/` folder and served statically.

Security notes:
- This demo server has no authentication and should not be used in production.
- Add authentication, authorization, CSRF protection, validation and virus scanning for production use.
