using Amazon.S3;
using Amazon.S3.Model;
using System.Security.Cryptography;
using System.Text;

namespace TwinPeaks.API.Services
{
    public interface IS3Service
    {
        Task<string> UploadAsync(Stream stream, string fileName, string contentType);
        Task DeleteAsync(string key);
        Task<(Stream stream, string contentType)> GetObjectStreamAsync(string key);
    }

    public class S3Service : IS3Service
    {
        private readonly IAmazonS3 _s3;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly string _bucket;
        private readonly string _accessKey;
        private readonly string _secretKey;
        private const string ServiceEndpoint = "https://s3.filebase.io";
        private const string Host = "s3.filebase.io";
        private const string Region = "us-east-1";
        private const string Service = "s3";

        public S3Service(IAmazonS3 s3, IHttpClientFactory httpClientFactory, IConfiguration config)
        {
            _s3 = s3;
            _httpClientFactory = httpClientFactory;
            _bucket = config["Filebase:BucketName"]
                ?? throw new InvalidOperationException("Filebase:BucketName is not configured.");
            _accessKey = config["Filebase:AccessKeyId"]
                ?? throw new InvalidOperationException("Filebase:AccessKeyId is not configured.");
            _secretKey = config["Filebase:SecretAccessKey"]
                ?? throw new InvalidOperationException("Filebase:SecretAccessKey is not configured.");
        }

        public async Task<string> UploadAsync(Stream stream, string fileName, string contentType)
        {
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);
            var body = ms.ToArray();

            var now = DateTime.UtcNow;
            var dateStamp = now.ToString("yyyyMMdd");
            var amzDate = now.ToString("yyyyMMddTHHmmssZ");

            var payloadHash = Hex(SHA256.HashData(body));
            var path = $"/{_bucket}/{fileName}";

            // Canonical request
            var signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
            var canonicalHeaders =
                $"content-type:{contentType}\n" +
                $"host:{Host}\n" +
                $"x-amz-content-sha256:{payloadHash}\n" +
                $"x-amz-date:{amzDate}\n";

            var canonicalRequest = string.Join("\n",
                "PUT", path, "",
                canonicalHeaders,
                signedHeaders,
                payloadHash);

            // String to sign
            var credentialScope = $"{dateStamp}/{Region}/{Service}/aws4_request";
            var stringToSign = string.Join("\n",
                "AWS4-HMAC-SHA256",
                amzDate,
                credentialScope,
                Hex(SHA256.HashData(Encoding.UTF8.GetBytes(canonicalRequest))));

            // Signing key
            var signingKey = GetSigningKey(_secretKey, dateStamp, Region, Service);
            var signature = Hex(HMACSHA256(signingKey, stringToSign));

            var authorization =
                $"AWS4-HMAC-SHA256 Credential={_accessKey}/{credentialScope}, " +
                $"SignedHeaders={signedHeaders}, Signature={signature}";

            var url = $"{ServiceEndpoint}{path}";
            var request = new HttpRequestMessage(HttpMethod.Put, url);
            request.Content = new ByteArrayContent(body);
            request.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
            request.Headers.TryAddWithoutValidation("Authorization", authorization);
            request.Headers.TryAddWithoutValidation("x-amz-date", amzDate);
            request.Headers.TryAddWithoutValidation("x-amz-content-sha256", payloadHash);

            var http = _httpClientFactory.CreateClient();
            var response = await http.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var body2 = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"Filebase PUT failed {(int)response.StatusCode}: {body2}");
            }

            return $"/api/images/{fileName}";
        }

        public async Task DeleteAsync(string key)
        {
            await _s3.DeleteObjectAsync(_bucket, key);
        }

        public async Task<(Stream stream, string contentType)> GetObjectStreamAsync(string key)
        {
            var response = await _s3.GetObjectAsync(_bucket, key);
            return (response.ResponseStream, response.Headers.ContentType ?? "application/octet-stream");
        }

        private static byte[] GetSigningKey(string secretKey, string dateStamp, string region, string service)
        {
            var kDate = HMACSHA256(Encoding.UTF8.GetBytes("AWS4" + secretKey), dateStamp);
            var kRegion = HMACSHA256(kDate, region);
            var kService = HMACSHA256(kRegion, service);
            return HMACSHA256(kService, "aws4_request");
        }

        private static byte[] HMACSHA256(byte[] key, string data) =>
            new HMACSHA256(key).ComputeHash(Encoding.UTF8.GetBytes(data));

        private static string Hex(byte[] bytes) =>
            Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
