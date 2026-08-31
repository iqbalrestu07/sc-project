package storage

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awscfg "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Storage uploads files to Supabase S3-compatible storage.
// The public URL is constructed as:
//
//	<endpoint>/<bucket>/<key>
//
// where endpoint already includes the /storage/v1/s3 path (Supabase convention)
// but for public object access we use the object URL format:
//
//	https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<key>
//
// However, since Supabase S3 public URLs follow the S3 path-style convention,
// we build the URL as:  <endpoint>/<bucket>/<key>
// This works with path-style addressing which Supabase S3 supports.
type S3Storage struct {
	client   *s3.Client
	bucket   string
	endpoint string // raw endpoint URL (e.g. https://<ref>.storage.supabase.co/storage/v1/s3)
}

// NewS3Storage creates an S3-compatible storage client for Supabase.
// endpoint: e.g. "https://xtgitbuwmrsdwdmmbmdl.storage.supabase.co/storage/v1/s3"
// region:   e.g. "ap-southeast-1"
// forcePathStyle: true for Supabase S3 (path-style addressing)
func NewS3Storage(ctx context.Context, endpoint, region, bucket, accessKey, secretKey string, forcePathStyle bool) (*S3Storage, error) {
	cfg, err := awscfg.LoadDefaultConfig(ctx,
		awscfg.WithRegion(region),
		awscfg.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load S3 config: %w", err)
	}

	// Supabase S3 uses path-style addressing
	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = forcePathStyle
	})

	return &S3Storage{
		client:   client,
		bucket:   bucket,
		endpoint: endpoint,
	}, nil
}

func (s *S3Storage) Upload(ctx context.Context, folder, filename string, reader io.Reader, contentType string) (string, error) {
	// Build the object key: <folder>/<filename>
	key := filename
	if folder != "" {
		key = strings.Trim(folder, "/") + "/" + filename
	}

	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        reader,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %w", err)
	}

	// Construct the public URL.
	// Supabase public object URL format:
	//   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<key>
	// We derive it from the S3 endpoint by replacing "/s3" with "/object/public".
	publicURL := strings.Replace(s.endpoint, "/storage/v1/s3", "/storage/v1/object/public", 1)
	publicURL = strings.TrimRight(publicURL, "/") + "/" + s.bucket + "/" + key
	return publicURL, nil
}
