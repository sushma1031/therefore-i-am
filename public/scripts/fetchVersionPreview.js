function showVersionToast(msg) {
  const toastEl = document.getElementById("versionPreviewToast");
  document.getElementById("versionToastMsg").textContent = msg || "Could not load version preview.";
  bootstrap.Toast.getOrCreateInstance(toastEl).show();
}

async function previewVersion(postID, versionID) {
  try {
    const res = await fetch(`/posts/${postID}/history/${versionID}`);
    if (!res.ok) {
      console.error(`Failed to fetch version preview: ${res.status}`);
      showVersionToast("Could not load version preview.");
      return;
    }
    const { title, content } = await res.json();
    document.getElementById("versionPreviewLabel").textContent = title;
    document.getElementById("versionBody").innerHTML = content;
    bootstrap.Offcanvas.getOrCreateInstance(document.getElementById("versionPreview")).show();
  } catch (err) {
    console.error("Failed to fetch version preview:", err);
    showVersionToast("Could not load version preview.");
  }
}
