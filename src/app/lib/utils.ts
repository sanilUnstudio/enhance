import { fabric } from "fabric";

export const resizeImageWBg = async ({ file, targetWidth, targetHeight }) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const base = e.target.result;
      const fabricCanvas = new fabric.Canvas("canvas", {
        width: 1024,
        height: 1024,
      });

      fabric.Image.fromURL(base, (fabricImage) => {
        fabricCanvas.add(fabricImage);

        // Resize image to target dimensions
        fabricCanvas.setWidth(targetWidth);
        fabricCanvas.setHeight(targetHeight);

        fabricImage.set({
          scaleX: targetWidth / fabricImage.width,
          scaleY: targetHeight / fabricImage.height,
        });

        // Render and return base64
        fabricCanvas.renderAll();
        const maskData = fabricCanvas.toDataURL({
          format: "png",
        });

        // Convert the image to grayscale
        const grayscaleCanvas = document.createElement("canvas");
        grayscaleCanvas.width = fabricCanvas.width;
        grayscaleCanvas.height = fabricCanvas.height;
        const ctx = grayscaleCanvas.getContext("2d");
        const tempImage = new Image();

        tempImage.onload = () => {
          ctx.drawImage(tempImage, 0, 0);
          const imageData = ctx.getImageData(
            0,
            0,
            grayscaleCanvas.width,
            grayscaleCanvas.height
          );
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const grayscale =
              0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const binary = grayscale > 0 ? 255 : 0; // Threshold for binary mask
            data[i] = binary; // Red
            data[i + 1] = binary; // Green
            data[i + 2] = binary; // Blue
            data[i + 3] = 255; // Alpha (Fully opaque)
          }

          ctx.putImageData(imageData, 0, 0);
          const maskBase64 = grayscaleCanvas.toDataURL("image/png");

          // Clean up
          fabricCanvas.dispose();
          grayscaleCanvas.remove();

          resolve(maskBase64);
        };
        tempImage.src = maskData;
      });
    };

    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const resizeImage = async (file, scale) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const base = e.target.result;
      const fabricCanvas = new fabric.Canvas("canvas", {
        width: 1024,
        height: 1024,
      });

      fabric.Image.fromURL(base, (fabricImage) => {
        fabricCanvas.add(fabricImage);

        // Original dimensions
        const originalWidth = fabricImage.width;
        const originalHeight = fabricImage.height;

        // New dimensions
        const newWidth = originalWidth * scale;
        const newHeight = originalHeight * scale;

        // Resize canvas and image
        fabricCanvas.setWidth(newWidth);
        fabricCanvas.setHeight(newHeight);

        fabricImage.set({
          scaleX: newWidth / originalWidth,
          scaleY: newHeight / originalHeight,
        });

        // Render and return base64
        fabricCanvas.renderAll();
        const maskData = fabricCanvas.toDataURL({
          format: "png",
        });

        resolve({ maskData, newHeight, newWidth });
      });
    };

    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};
