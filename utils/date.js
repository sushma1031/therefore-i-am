exports.getDate = (date) => {
  if (!(date instanceof Date) || isNaN(date)) return "";

  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

exports.calcRelativeDate = function (inputDate) {
  const today = new Date();
  const date = new Date(inputDate);

  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diff = today - date;

  if (diff === 0) return "Today";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 30) {
    return days == 1 ? "1 day ago" : `${days} days ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 6) {
    return months == 1 ? "1 month ago" : `${months} months ago`;
  }

  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};
