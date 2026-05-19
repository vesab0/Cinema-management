using SendGrid;
using SendGrid.Helpers.Mail;

namespace TwinPeaks.API.Services
{
    public class SendGridEmailService : IEmailService
    {
        private readonly string _apiKey;
        private readonly string _fromEmail;
        private readonly string _fromName;
        private readonly bool _configured;
        private readonly ILogger<SendGridEmailService> _logger;

        public SendGridEmailService(IConfiguration config, ILogger<SendGridEmailService> logger)
        {
            _apiKey    = config["SendGrid:ApiKey"]    ?? string.Empty;
            _fromEmail = config["SendGrid:FromEmail"] ?? string.Empty;
            _fromName  = config["SendGrid:FromName"]  ?? "Twin Peaks Cinema";
            _configured = !string.IsNullOrWhiteSpace(_apiKey) && !string.IsNullOrWhiteSpace(_fromEmail);
            _logger = logger;
        }

        public async Task SendAsync(string to, string subject, string htmlBody)
        {
            if (!_configured)
            {
                _logger.LogWarning("[Email] SendGrid not configured. Would send to {To}: {Subject}", to, subject);
                return;
            }

            var client = new SendGridClient(_apiKey);
            var from   = new EmailAddress(_fromEmail, _fromName);
            var toAddr = new EmailAddress(to);
            var msg    = MailHelper.CreateSingleEmail(from, toAddr, subject, plainTextContent: null, htmlContent: htmlBody);

            var response = await client.SendEmailAsync(msg);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Body.ReadAsStringAsync();
                _logger.LogError("SendGrid returned {Status} for {To}: {Body}", (int)response.StatusCode, to, body);
            }
        }
    }
}
