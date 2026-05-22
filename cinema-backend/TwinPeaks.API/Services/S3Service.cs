using Amazon.S3;
using Amazon.S3.Model;

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
        private readonly string _bucket;
        private readonly string _publicUrl;

        public S3Service(IAmazonS3 s3, IConfiguration config)
        {
            _s3 = s3;
            _bucket = config["Filebase:BucketName"]
                ?? throw new InvalidOperationException("Filebase:BucketName is not configured.");
            _publicUrl = config["Filebase:PublicUrl"]
                ?? throw new InvalidOperationException("Filebase:PublicUrl is not configured.");
        }

        public async Task<string> UploadAsync(Stream stream, string fileName, string contentType)
        {
            var request = new PutObjectRequest
            {
                BucketName = _bucket,
                Key = fileName,
                InputStream = stream,
                ContentType = contentType,
            };

            await _s3.PutObjectAsync(request);

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
    }
}
