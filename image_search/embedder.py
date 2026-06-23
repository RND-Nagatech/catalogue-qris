"""
DINOv2 Embedder — ekstrak 768-d feature vector dari gambar perhiasan.
"""
import os
import torch
import numpy as np
from PIL import Image
from torchvision import transforms


class DINOv2Embedder:
    def __init__(self, model_name: str = "dinov2_vitb14", device: str = None):
        self.model_name = model_name
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        print(f"[embedder] Loading {model_name} on {self.device}...")
        self.model = torch.hub.load("facebookresearch/dinov2", model_name)
        self.model.to(self.device)
        self.model.eval()

        # Preprocessing — DINOv2 expects 224x224 normalized images
        self.transform = transforms.Compose(
            [
                transforms.Resize(256, interpolation=transforms.InterpolationMode.BICUBIC),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
                ),
            ]
        )

        self.vector_size = 768 if "vitb" in model_name else 384 if "vits" in model_name else 1024
        print(f"[embedder] Ready. Vector size: {self.vector_size}")

    def preprocess(self, image: Image.Image) -> torch.Tensor:
        """Preprocess PIL image → tensor (1, 3, 224, 224)"""
        if image.mode != "RGB":
            image = image.convert("RGB")
        return self.transform(image).unsqueeze(0)

    def embed(self, image: Image.Image) -> np.ndarray:
        """Extract embedding vector dari satu gambar → numpy (768,)"""
        tensor = self.preprocess(image).to(self.device)

        with torch.no_grad():
            features = self.model(tensor)

        # DINOv2 output: (1, 768) — sudah normalized
        vec = features.cpu().numpy().flatten().astype(np.float32)
        # Normalize ke unit vector untuk cosine similarity
        vec = vec / (np.linalg.norm(vec) + 1e-8)
        return vec

    def embed_batch(self, images: list[Image.Image], batch_size: int = 32) -> np.ndarray:
        """Extract embeddings dari batch gambar → (N, 768)"""
        tensors = torch.cat([self.preprocess(img) for img in images], dim=0).to(self.device)
        all_features = []

        for i in range(0, len(tensors), batch_size):
            batch = tensors[i : i + batch_size]
            with torch.no_grad():
                features = self.model(batch)
            all_features.append(features.cpu().numpy())

        result = np.concatenate(all_features, axis=0).astype(np.float32)
        # Normalize
        norms = np.linalg.norm(result, axis=1, keepdims=True)
        result = result / (norms + 1e-8)
        return result


# Singleton instance
_embedder = None


def get_embedder(model_name: str = None) -> DINOv2Embedder:
    global _embedder
    if _embedder is None:
        name = model_name or os.getenv("MODEL_NAME", "dinov2_vitb14")
        _embedder = DINOv2Embedder(model_name=name)
    return _embedder
