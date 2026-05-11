/**
 * Product Image Manager - Admin Page
 * Manage product images: upload, reorder, set primary, delete, regenerate from Pexels
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Upload, Trash2, RefreshCw, Star, Loader2, AlertCircle,
  ChevronUp, ChevronDown, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

export default function ProductImageManager() {
  const { productId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");

  // Load product and images
  useEffect(() => {
    loadProductAndImages();
  }, [productId]);

  async function loadProductAndImages() {
    try {
      setIsLoading(true);
      setError("");

      // Get product details
      const productRes = await fetch(`/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!productRes.ok) throw new Error("Product not found");
      const productData = await productRes.json();
      setProduct(productData);

      // Get images
      const imagesRes = await fetch(
        `/api/admin/products/${productId}/images`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!imagesRes.ok) throw new Error("Failed to load images");
      const { images: imagesData } = await imagesRes.json();
      setImages(imagesData || []);
    } catch (err) {
      setError(err.message || "Failed to load product");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetPrimary(imageId) {
    try {
      setIsSaving(true);
      const res = await fetch(
        `/api/admin/products/${productId}/images/${imageId}/primary`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("Failed to set primary image");
      setSuccess("Primary image updated");
      await loadProductAndImages();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteImage(imageId) {
    if (!confirm("Delete this image? This cannot be undone.")) return;

    try {
      setIsSaving(true);
      const res = await fetch(
        `/api/admin/products/${productId}/images/${imageId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Failed to delete image");
      setSuccess("Image deleted");
      await loadProductAndImages();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRegeneratePexels() {
    if (!confirm("Regenerate images from Pexels? This will replace current gallery images.")) return;

    try {
      setIsRegenerating(true);
      setError("");
      const res = await fetch(
        `/api/admin/products/${productId}/images/regenerate`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to regenerate images");
      }
      setSuccess("Images regenerated from Pexels!");
      await loadProductAndImages();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleAddImage() {
    if (!uploadUrl.trim()) {
      setError("Please enter an image URL");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: uploadUrl,
          altText: product?.name || "Product image",
        }),
      });

      if (!res.ok) throw new Error("Failed to add image");
      setSuccess("Image added successfully");
      setUploadUrl("");
      await loadProductAndImages();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          {product?.name || "Product Images"}
        </h1>
        <p className="text-muted-foreground">
          Manage images for this product. Set a primary image, add gallery images, or regenerate from Pexels.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg">
          {success}
        </div>
      )}

      {/* Add Image Section */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add Image</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={uploadUrl}
            onChange={(e) => setUploadUrl(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <Button
            onClick={handleAddImage}
            disabled={isSaving || !uploadUrl.trim()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Add
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Paste a direct image URL. Images should be at least 600x400px for best results.
        </p>
      </Card>

      {/* Regenerate from Pexels */}
      <Card className="p-6 mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Regenerate from Pexels</h2>
            <p className="text-sm text-muted-foreground">
              Automatically fetch new images from Pexels API based on product name.
            </p>
          </div>
          <Button
            onClick={handleRegeneratePexels}
            disabled={isRegenerating}
            variant="secondary"
            className="gap-2"
          >
            {isRegenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Image Gallery */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Gallery ({images.length} images)
        </h2>

        {images.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <p>No images yet. Add one above or regenerate from Pexels.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {images.map((img, idx) => (
              <Card key={img.id} className="p-4 flex gap-4 items-start">
                {/* Image Preview */}
                <div className="w-32 h-32 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden">
                  <img
                    src={img.imageUrl}
                    alt={img.altText || "Product image"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/images/component-placeholder.svg";
                    }}
                  />
                </div>

                {/* Image Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{img.altText || "Image"}</h3>
                    {img.isPrimary && (
                      <Badge className="bg-amber-500">Primary</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground break-all mb-3">
                    {img.imageUrl}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Sort Order: {img.sortOrder}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {!img.isPrimary && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetPrimary(img.id)}
                        disabled={isSaving}
                        className="gap-1"
                      >
                        <Star className="h-3.5 w-3.5" />
                        Set Primary
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(img.imageUrl);
                        setSuccess("Image URL copied!");
                      }}
                      className="gap-1"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy URL
                    </Button>
                    {images.length > 1 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteImage(img.id)}
                        disabled={isSaving}
                        className="gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
