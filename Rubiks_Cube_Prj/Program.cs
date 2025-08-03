// --- ADD THIS LINE AT THE TOP ---
using Microsoft.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles();

// --- REPLACE app.UseStaticFiles(); WITH THIS BLOCK ---
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // Disable caching for all static files
        ctx.Context.Response.Headers[HeaderNames.CacheControl] =
            "no-cache, no-store";
    }
});

app.Run();