using TwinPeaks.API.Services;
using Stripe;

namespace TwinPeaks.API.Routers
{
    public static class StripeRouter
    {
        public static void MapStripeRoutes(this WebApplication app)
        {
            var group = app.MapGroup("/api/stripe");

            group.MapPost("/create-payment-intent", async (
                CreatePaymentIntentRequest req,
                StripeService stripeService) =>
            {
                try
                {
                    var result = await stripeService.CreatePaymentIntentAsync(req.TicketId);
                    return Results.Ok(new
                    {
                        result.ClientSecret,
                        result.PaymentIntentId,
                        result.AmountInCents
                    });
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (StripeException ex)
                {
                    return Results.Problem(title: "Stripe error", detail: ex.Message, statusCode: 502);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to create payment intent", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapPost("/create-multi-payment-intent", async (
                CreateMultiPaymentIntentRequest req,
                StripeService stripeService) =>
            {
                try
                {
                    var result = await stripeService.CreateMultiPaymentIntentAsync(req.TicketIds, req.UserId);
                    return Results.Ok(new
                    {
                        result.ClientSecret,
                        result.PaymentIntentId,
                        result.AmountInCents
                    });
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (StripeException ex)
                {
                    return Results.Problem(title: "Stripe error", detail: ex.Message, statusCode: 502);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to create payment intent", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapPost("/webhook", async (
                HttpRequest request,
                IConfiguration config,
                UserTicketService userTicketService) =>
            {
                var webhookSecret = config["Stripe:WebhookSecret"];
                if (string.IsNullOrEmpty(webhookSecret))
                    return Results.Problem(title: "Webhook secret not configured", statusCode: 500);

                string json;
                using (var reader = new StreamReader(request.Body))
                    json = await reader.ReadToEndAsync();

                try
                {
                    var stripeEvent = EventUtility.ConstructEvent(
                        json,
                        request.Headers["Stripe-Signature"],
                        webhookSecret);

                    if (stripeEvent.Type == EventTypes.PaymentIntentSucceeded)
                    {
                        var intent = (PaymentIntent)stripeEvent.Data.Object;
                        if (intent.Metadata.TryGetValue("ticketId", out var ticketIdStr)
                            && Guid.TryParse(ticketIdStr, out var ticketId)
                            && intent.Metadata.TryGetValue("userId", out var userIdStr)
                            && Guid.TryParse(userIdStr, out var userId))
                        {
                            userTicketService.FinalizeFromWebhook(userId, ticketId, intent.Id);
                        }
                    }

                    return Results.Ok();
                }
                catch (StripeException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
            });
        }
    }

    public record CreatePaymentIntentRequest(Guid TicketId);
}
