const crypto = require("crypto");

const webhookSecret = process.env.TYPEFORM_WEBHOOK_SECRET; // set your webhook secret

if (!webhookSecret) {
  console.warn(
    "⚠️  WARNING: TYPEFORM_WEBHOOK_SECRET is not set. Please set it in .env file. ⚠️"
  );
  process.exit(1);
}

async function initializeServer() {
  // initialize fastify
  const fastify = require("fastify")({
    logger: true,
  });

  // add plugin to keep raw body of the request
  // necessary to properly calculate request body hash to validate webhook signature
  await fastify.register(require("fastify-raw-body"), {
    field: "rawBody", // name of the prop
    global: false, // do not add to every route (for performance purposes)
  });

  // post endpoint for your typeform webhook
  // https://www.typeform.com/help/webhooks/
  fastify.post("/typeform/webhook", {
    config: {
      rawBody: true, // add the rawBody to this route
    },
    handler: async (request, reply) => {
      console.log("~> webhook received");

      console.log(typeof request.rawBody, request.rawBody);

      // security check, let's make sure request comes from typeform
      const signature = request.headers["typeform-signature"];
      const isValid = verifySignature(signature, request.rawBody);
      console.log("isvalid", isValid);
      if (!isValid) {
        throw new Error(
          "Webhook signature is not valid, someone is faking this!"
        );
      }

      // send 200 status back, and notify typeform 👌
      reply.code(200).send({ status: "ok" });

      // extract details from webhook payload
      const { event_type, form_response } = JSON.parse(request.rawBody);

      // filter response events only
      if (event_type === "form_response") {
        // TODO: process form_response data here
        console.log("form_response", form_response);
      }
    },
  });

  // run the server on port 3000
  fastify.listen({ port: 3000 }, (err, address) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  });
}

initializeServer(); // start server (async)

// function to verify request signature
const verifySignature = function (receivedSignature, payload) {
  const hash = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("base64");
  console.log(receivedSignature);
  console.log(`sha256=${hash}`);
  return receivedSignature === `sha256=${hash}`;
};
