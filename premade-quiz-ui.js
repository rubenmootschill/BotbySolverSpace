const premadeTutorialBtn = document.getElementById("premadeTutorialBtn");
const premadeTutorialModal = document.getElementById("premadeTutorialModal");
const premadeTutorialCloseBtn = document.getElementById("premadeTutorialCloseBtn");

if (premadeTutorialBtn && premadeTutorialModal && premadeTutorialCloseBtn) {
  premadeTutorialBtn.addEventListener("click", openPremadeTutorialModal);
  premadeTutorialCloseBtn.addEventListener("click", closePremadeTutorialModal);
  premadeTutorialModal.addEventListener("click", (event) => {
    if (event.target === premadeTutorialModal) {
      closePremadeTutorialModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && premadeTutorialModal && !premadeTutorialModal.hidden) {
    closePremadeTutorialModal();
  }
});

function openPremadeTutorialModal() {
  if (!premadeTutorialModal || !premadeTutorialCloseBtn) {
    return;
  }

  premadeTutorialModal.hidden = false;
  premadeTutorialCloseBtn.focus();
}

function closePremadeTutorialModal() {
  if (!premadeTutorialModal || !premadeTutorialBtn) {
    return;
  }

  premadeTutorialModal.hidden = true;
  premadeTutorialBtn.focus();
}
