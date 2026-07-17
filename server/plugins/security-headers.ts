export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    // Security headers applied to every response via response handler
  });

  nitroApp.hooks.hook("afterResponse", (_event, response) => {
    response.headers = response.headers || {};

    // Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY";

    // Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff";

    // XSS protection (legacy, but explicit)
    response.headers["X-XSS-Protection"] = "0";

    // Referrer policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

    // Permissions policy — restrict powerful features
    response.headers["Permissions-Policy"] = [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
      "autoplay=()",
      "encrypted-media=()",
      "picture-in-picture=()",
    ].join(", ");

    // HSTS — 2 years, include subdomains, allow preload list
    response.headers["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains; preload";

    // Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://m.stripe.network",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://image.tmdb.org https://*.supabase.co https://adsterra.com https://*.adsterra.com",
      "media-src 'self' blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co https://api.themoviedb.org https://api.stripe.com wss://*.supabase.co",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.adsterra.com https://adsterra.com",
      "worker-src 'self' blob:",
      "child-src 'self' blob: https://*.adsterra.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ];
    response.headers["Content-Security-Policy"] = cspDirectives.join("; ");
  });
});
