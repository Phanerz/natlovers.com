// fetch() has no cross-browser way to report upload progress for a
// multipart body, so image uploads (which can genuinely take a few seconds
// on a slow connection) go through XMLHttpRequest instead, whose
// upload.onprogress gives real, non-simulated percentages.
export type SubmitResult = {ok: boolean; status: number; data: any};

export function submitFormData(
  url: string,
  method: "POST" | "PATCH",
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<SubmitResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: any = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = null;
      }
      resolve({ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data});
    };

    xhr.onerror = () => reject(new Error("Network error while uploading."));

    xhr.send(formData);
  });
}
