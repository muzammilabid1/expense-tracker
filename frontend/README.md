# Northstar frontend

This is the Next.js frontend for the existing NestJS GraphQL API. It does not create another database or authentication service.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_GRAPHQL_URL` to the backend GraphQL URL. The default assumes NestJS runs at `http://localhost:3000/graphql`; use port `3001` if that is where the backend is listening.
3. From the backend folder, start NestJS. Its configured CORS origin defaults to `http://localhost:5173`.
4. From this folder, run `npm install`, then `npm run dev` and open `http://localhost:5173`.

If you use a different frontend port, set the backend's `FRONTEND_ORIGIN` to that exact origin and restart the API. Browser requests include credentials so the API's HttpOnly refresh cookie is sent.

The access token is kept in memory, not browser storage. On page load the app calls the backend's `refresh` mutation to recover a session from its cookie. Amounts have no currency symbol by default because the backend has no currency field; set `NEXT_PUBLIC_CURRENCY` to an ISO 4217 code only if all saved amounts use that currency.

## API behavior reflected in the UI

- Dashboard trend is assembled from six real monthly summary queries. Recent activity comes from the authenticated transaction list.
- The API has no transaction search or pagination fields. Search, sorting, and page controls therefore operate on the authenticated results in the browser; type, category, and date filters use the API.
- Edit loads the authenticated transaction list and finds the requested ID because there is no single-transaction query.
- Profile name/email updates are supported. Password changes and logout are not exposed by the current backend, so the UI does not claim to perform them.
- Signup and login set the refresh cookie in the backend response. Forgot-password and email verification are not supported.
