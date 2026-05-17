document.querySelectorAll(".local-date").forEach((el) => {
  const utcString = el.getAttribute("datetime");
  const formatType = el.getAttribute("data-format");
  const date = new Date(utcString);

  if (isNaN(date)) return;

  const baseOptions = { year: "numeric", month: "short", day: "numeric" };

  if (formatType === "datetime") {
    el.textContent = el.textContent = date.toLocaleString("en-US", {
      hour12: true,
    });
  } else {
    el.textContent = date.toLocaleDateString("en-US", baseOptions);
  }
});

document.querySelectorAll(".relative-date").forEach((el) => {
  const utcString = el.getAttribute("datetime");
  const date = new Date(utcString);
  const today = new Date();

  if (!isNaN(date)) return;

  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diff = today - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  let relativeText = "";
  if (days === 0) relativeText = "Today";
  else if (days === 1) relativeText = "1 day ago";
  else if (days > 1 && days < 30) relativeText = `${days} days ago`;
  else {
    relativeText = date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  el.textContent = relativeText;
});
