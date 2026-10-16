(function () {
  "use strict";

  const TOTAL_EXPECTED = 320;
  const optionLetters = ["A", "B", "C", "D"];
  let quiz;

  const elements = {};

  function cacheElements() {
    [
      "welcome-screen", "quiz-screen", "result-screen", "start-button", "progress-text",
      "correct-count", "progress-bar", "question-card", "question-number", "question-level",
      "question-chapter", "question-text", "answers", "feedback", "explanation",
      "correct-answer-line", "explanation-text", "next-button", "result-score",
      "result-percentage", "result-correct", "result-wrong", "restart-button", "data-error",
    ].forEach((id) => { elements[id] = document.getElementById(id); });
  }

  function showOnly(screenId) {
    ["welcome-screen", "quiz-screen", "result-screen"].forEach((id) => {
      elements[id].classList.toggle("d-none", id !== screenId);
    });
  }

  function startQuiz() {
    quiz.restart();
    showOnly("quiz-screen");
    renderQuestion();
  }

  function renderQuestion() {
    const question = quiz.getCurrentQuestion();
    const state = quiz.getState();
    const current = state.currentQuestionIndex + 1;

    elements["question-number"].textContent = `CÂU ${question.id} / ${quiz.questions.length}`;
    elements["question-level"].textContent = `CẤP ĐỘ ${question.level}`;
    elements["question-chapter"].textContent = question.chapter;
    elements["question-text"].textContent = question.question;
    elements.answers.replaceChildren(...optionLetters.map((letter) => createAnswerButton(letter, question.options[letter])));

    elements.feedback.className = "feedback d-none";
    elements.feedback.textContent = "";
    elements.explanation.classList.add("d-none");
    elements["next-button"].classList.add("d-none");
    elements["next-button"].innerHTML = current === quiz.questions.length
      ? "XEM KẾT QUẢ <span aria-hidden=\"true\">→</span>"
      : "CÂU TIẾP THEO <span aria-hidden=\"true\">→</span>";

    updateProgress();
    elements["question-text"].focus({ preventScroll: true });
  }

  function createAnswerButton(letter, text) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-option";
    button.dataset.answer = letter;
    button.setAttribute("aria-label", `${letter}. ${text}`);

    const key = document.createElement("span");
    key.className = "answer-key";
    key.textContent = letter;

    const copy = document.createElement("span");
    copy.className = "answer-copy";
    copy.textContent = text;

    const status = document.createElement("span");
    status.className = "answer-status";
    status.setAttribute("aria-hidden", "true");

    button.append(key, copy, status);
    button.addEventListener("click", () => selectAnswer(letter));
    return button;
  }

  function selectAnswer(letter) {
    const result = quiz.selectAnswer(letter);
    if (!result.accepted) return;

    if (result.outcome === "correct") handleCorrectAnswer(letter, result.attempt);
    else handleWrongAnswer(letter, result.outcome);

    updateProgress();
  }

  function handleCorrectAnswer(letter, attempt) {
    markAnswer(letter, "is-correct", "✓");
    lockAnswers();
    showFeedback(attempt === 1 ? "Chính xác!" : "Chính xác ở lượt thứ hai!", "is-success");
    showExplanation();
    elements["next-button"].classList.remove("d-none");
  }

  function handleWrongAnswer(letter, outcome) {
    markAnswer(letter, "is-incorrect", "✕");
    const selectedButton = getAnswerButton(letter);
    selectedButton.disabled = true;
    selectedButton.setAttribute("aria-disabled", "true");

    if (outcome === "retry") {
      showFeedback("Chưa chính xác! Bạn còn 1 lượt trả lời.", "is-error");
      return;
    }

    const question = quiz.getCurrentQuestion();
    markAnswer(question.answer, "is-correct", "✓");
    lockAnswers();
    showFeedback("Bạn đã hết lượt trả lời.", "is-error");
    showExplanation();
    elements["next-button"].classList.remove("d-none");
  }

  function getAnswerButton(letter) {
    return elements.answers.querySelector(`[data-answer="${letter}"]`);
  }

  function markAnswer(letter, className, symbol) {
    const button = getAnswerButton(letter);
    button.classList.add(className);
    button.querySelector(".answer-status").textContent = symbol;
  }

  function showFeedback(message, className) {
    elements.feedback.textContent = message;
    elements.feedback.className = `feedback ${className}`;
  }

  function showExplanation() {
    const question = quiz.getCurrentQuestion();
    elements["correct-answer-line"].textContent = `✓ Đáp án đúng: ${question.answer} — ${question.options[question.answer]}`;
    elements["explanation-text"].textContent = question.explanation;
    elements.explanation.classList.remove("d-none");
  }

  function lockAnswers() {
    elements.answers.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
    });
  }

  function nextQuestion() {
    const result = quiz.nextQuestion();
    if (result.finished) {
      showResult();
      return;
    }
    if (!result.advanced) return;

    renderQuestion();
    elements["question-card"].scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showResult() {
    const result = quiz.getResult();
    elements["result-score"].textContent = `${result.correct} / ${result.total}`;
    elements["result-percentage"].textContent = `${result.percentage}%`;
    elements["result-correct"].textContent = `${result.correct} câu`;
    elements["result-wrong"].textContent = `${result.wrong} câu`;
    showOnly("result-screen");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restartQuiz() {
    startQuiz();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateProgress() {
    const state = quiz.getState();
    const current = state.currentQuestionIndex + 1;
    const completed = state.questionCompleted ? current : current - 1;
    const total = quiz.questions.length;
    elements["progress-text"].textContent = `${current} / ${total}`;
    elements["correct-count"].textContent = String(state.correctAnswers);
    elements["progress-bar"].style.width = `${(completed / total) * 100}%`;
    elements["progress-bar"].setAttribute("aria-valuenow", String(completed));
  }

  function validateData(questions) {
    if (!Array.isArray(questions) || questions.length !== TOTAL_EXPECTED) return false;
    return questions.every((question, index) => (
      question.id === index + 1
      && optionLetters.every((letter) => typeof question.options[letter] === "string" && question.options[letter].length > 0)
      && optionLetters.includes(question.answer)
      && typeof question.chapter === "string" && question.chapter.length > 0
    ));
  }

  function initialize() {
    cacheElements();
    if (!validateData(window.QUESTIONS)) {
      elements["welcome-screen"].classList.add("d-none");
      elements["data-error"].textContent = "Không thể khởi tạo bài kiểm tra: dữ liệu 320 câu hỏi không hợp lệ.";
      elements["data-error"].classList.remove("d-none");
      return;
    }

    quiz = new window.QuizEngine(window.QUESTIONS);
    elements["start-button"].addEventListener("click", startQuiz);
    elements["next-button"].addEventListener("click", nextQuestion);
    elements["restart-button"].addEventListener("click", restartQuiz);
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
