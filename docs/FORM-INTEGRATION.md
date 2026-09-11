# Form integration

**The template sends no lead data by default.** A valid submission reports “Demo only. Your request was not sent.” Fields remain filled and the button stays usable. No submitted event, request or persistent storage is used. The visible fields and validation stay intact. The form's method="dialog" prevents native navigation/submission outside a dialog if JavaScript is unavailable; JavaScript handles configured delivery.

## Customer-owned Lead Service

Copy .env.example to your ignored .env, or set these build-time variables in your own publishing environment:

```dotenv
PUBLIC_LEAD_MODE=live
PUBLIC_LEAD_ENDPOINT=https://forms.example.com/submit
PUBLIC_LEAD_PROJECT_ID=your-project
PUBLIC_LEAD_FORM_ID=your-form
```

The example URL is illustrative, not a provided service. Use your own HTTPS endpoint, set all four values and rebuild. Blank identifiers, invalid URL or unconfigured live mode fail closed with a call-us message. Omitting live mode keeps the demo even when an endpoint is present. No seller fallback exists.

Configuration is in src/config/lead.ts; behavior is in src/scripts/lead-form.ts. No backend is bundled. PUBLIC_* values are browser-visible: never put credentials, private webhooks, secret headers or authentication tokens in them. [Astro environment variables](https://docs.astro.build/en/guides/environment-variables/) are compiled into the static build; variable changes require rebuilding.

## Request and response

The HTTPS JSON POST contains project_id, form_id, fields, meta and website. Fields include name, phone, email, zip and message. Additional named controls are included; repeated names become arrays. The website honeypot stays separate. Metadata contains page URL, referrer and the five UTM parameters. Avoid sensitive URL data and implement your privacy/consent requirements before collecting production requests.

Return a successful HTTP status with JSON `{ "success": true }` only after acceptance. Other statuses, invalid JSON, network failures and the 15-second timeout preserve inputs and show a generic error. Requests omit credentials, reject redirects and do not retry automatically. Confirmed success resets fields, prevents duplicates and emits rooflume:lead-submitted with field data. Review listeners before adding analytics; never log personal data. Adjust callback wording if the customer cannot promise it.

Your service owns CORS for your origin, server-side validation, spam/rate limits, privacy controls and downstream delivery. A lost response can still represent an accepted request; design server duplicate handling accordingly.

## Verification

npm run qa:form checks demo, JavaScript-disabled fallback, missing configuration and live success/error/timeout paths in temporary builds with intercepted requests. No real leads are sent. Verify actual production delivery with customer authorization after configuring their own service.
