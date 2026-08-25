document.getElementById("year").textContent = new Date().getFullYear();

document.getElementById("exploreBtn").addEventListener("click", () => {
  document.getElementById("about").scrollIntoView({ behavior: "smooth" });
});
