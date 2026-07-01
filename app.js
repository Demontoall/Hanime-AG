const menu = document.getElementById("menu");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

menu.onclick = () => {
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
};

overlay.onclick = () => {
  sidebar.classList.remove("active");
  overlay.classList.remove("active");
};
