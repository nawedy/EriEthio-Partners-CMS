import { useState, useEffect } from 'react';

interface OptimizeImageOptions {
  width?: number;
  height?: number;
  quality?: number;
}

export function useOptimizedImage(
  imageUrl: string,
  options: OptimizeImageOptions = {}
) {
  const [optimizedUrl, setOptimizedUrl] = useState<string>(imageUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const optimizeImage = async () => {
      if (!imageUrl) {
        setIsLoading(false);
        return;
      }

      try {
        // Extract the key from the S3 URL
        const key = imageUrl.split('.com/')[1];
        
        const response = await fetch('/api/assets/optimize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key,
            ...options,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to optimize image');
        }

        const data = await response.json();
        setOptimizedUrl(data.url);
        setError(null);
      } catch (err) {
        setError(err as Error);
        // Fall back to original URL on error
        setOptimizedUrl(imageUrl);
      } finally {
        setIsLoading(false);
      }
    };

    optimizeImage();
  }, [imageUrl, options.width, options.height, options.quality]);

  return {
    url: optimizedUrl,
    isLoading,
    error,
  };
}
