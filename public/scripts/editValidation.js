import isContentEmpty from "./contentValidation.js";

const editForm = document.querySelector(".edit-form");
const imageInput = document.querySelector(".edit-form #image");
const imageSrc = document.querySelector(".edit-form #imageSource");
const deleteImageInput = document.querySelector("#deleteImage");
const removeImageBtn = document.querySelector("#removeImage");
const thumbnail = document.querySelector(".thumbnail-img");

let prevSrc = imageSrc.value;

const originalThumbnailSrc = thumbnail.getAttribute("src");
const hadOriginalImage = !thumbnail.classList.contains("d-none");

editForm.addEventListener(
  "submit",
  (event) => {
    if (imageInput.files.length === 0 && deleteImageInput.value !== "true") {
      imageSrc.value = prevSrc;
    }
    if (isContentEmpty() || !editForm.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
    }
    editForm.classList.add("was-validated");
  },
  false,
);

imageInput.addEventListener("change", (event) => {
  const files = event.target.files;

  if (files.length === 0) {
    if (hadOriginalImage) {
      thumbnail.src = originalThumbnailSrc;
      thumbnail.classList.remove("d-none");
      removeImageBtn.classList.remove("d-none");
    } else {
      thumbnail.classList.add("d-none");
      removeImageBtn.classList.add("d-none");
    }
    deleteImageInput.value = "false";
    imageSrc.value = prevSrc;
    return;
  }

  deleteImageInput.value = "false";
  imageSrc.value = "";

  const imgFile = files[0];
  thumbnail.file = imgFile;

  const reader = new FileReader();
  reader.onload = (e) => {
    thumbnail.src = e.target.result;
  };
  reader.readAsDataURL(imgFile);

  thumbnail.classList.remove("d-none");
  removeImageBtn.classList.remove("d-none");
});

removeImageBtn.addEventListener("click", () => {
  imageInput.value = "";
  imageSrc.value = "";
  deleteImageInput.value = "true";
  thumbnail.src = "";
  thumbnail.classList.add("d-none");
  removeImageBtn.classList.add("d-none");
});
