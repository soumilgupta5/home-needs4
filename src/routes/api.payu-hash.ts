import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createHash } from "crypto";

export const Route = createFileRoute("/api/payu-hash")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        const { txnid, amount, productinfo, firstname, email, phone } = body;

        const PAYU_KEY = process.env.PAYU_MERCHANT_KEY;
        const PAYU_SALT = process.env.PAYU_MERCHANT_SALT;

        if (!PAYU_KEY || !PAYU_SALT) {
          return new Response(
            JSON.stringify({ error: "PayU merchant credentials not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        if (!txnid || !amount || !productinfo || !firstname || !email) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        // PayU hash string: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
        const hashString = `${PAYU_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${PAYU_SALT}`;
        const hash = createHash("sha512").update(hashString).digest("hex");

        return new Response(
          JSON.stringify({ hash, key: PAYU_KEY }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      },
    },
  },
});
