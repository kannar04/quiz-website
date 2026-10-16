const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/questions.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/quiz.js"), "utf8"), context);

const questions = context.window.QUESTIONS;
const QuizEngine = context.window.QuizEngine;

function wrongLetters(question) {
  return ["A", "B", "C", "D"].filter((letter) => letter !== question.answer);
}

assert.strictEqual(questions.length, 320, "Phải có đúng 320 câu");
questions.forEach((question, index) => {
  assert.strictEqual(question.id, index + 1, `Sai thứ tự câu ${index + 1}`);
  assert.deepStrictEqual(Object.keys(question.options), ["A", "B", "C", "D"]);
  assert.match(question.answer, /^[A-D]$/);
  assert.ok(question.chapter);
  assert.ok(question.explanation);
});
assert.deepStrictEqual(
  Array.from(questions.filter((question, index) => index === 0 || question.chapter !== questions[index - 1].chapter), (question) => question.id),
  [1, 45, 135, 179, 275],
  "Phải giữ đúng năm chương và ranh giới chương từ nguồn",
);

{
  const quiz = new QuizEngine(questions);
  const correct = questions[0].answer;
  assert.strictEqual(quiz.selectAnswer(correct).outcome, "correct");
  assert.strictEqual(quiz.getState().correctAnswers, 1);
  assert.strictEqual(quiz.selectAnswer(correct).accepted, false, "Không cộng trùng điểm");
  assert.strictEqual(quiz.getState().correctAnswers, 1);
  assert.strictEqual(quiz.nextQuestion().advanced, true);
  assert.strictEqual(quiz.getState().attempts, 0);
}

{
  const quiz = new QuizEngine(questions);
  const [wrong] = wrongLetters(questions[0]);
  assert.strictEqual(quiz.selectAnswer(wrong).outcome, "retry");
  assert.strictEqual(quiz.selectAnswer(wrong).accepted, false, "Không cho chọn lại đáp án sai");
  assert.strictEqual(quiz.nextQuestion().advanced, false, "Không chuyển câu khi chưa hoàn tất");
  assert.strictEqual(quiz.selectAnswer(questions[0].answer).outcome, "correct");
  assert.strictEqual(quiz.getState().correctAnswers, 1);
}

{
  const quiz = new QuizEngine(questions);
  const [wrong1, wrong2] = wrongLetters(questions[0]);
  assert.strictEqual(quiz.selectAnswer(wrong1).outcome, "retry");
  assert.strictEqual(quiz.selectAnswer(wrong2).outcome, "exhausted");
  assert.strictEqual(quiz.getState().correctAnswers, 0);
  assert.strictEqual(quiz.selectAnswer(questions[0].answer).accepted, false, "Không cho lượt thứ ba");
}

{
  const quiz = new QuizEngine(questions);
  questions.forEach((question, index) => {
    assert.strictEqual(quiz.selectAnswer(question.answer).outcome, "correct");
    const transition = quiz.nextQuestion();
    if (index < questions.length - 1) assert.strictEqual(transition.advanced, true);
    else assert.strictEqual(transition.finished, true);
  });
  const result = quiz.getResult();
  assert.strictEqual(result.correct, 320);
  assert.strictEqual(result.wrong, 0);
  assert.strictEqual(result.total, 320);
  assert.strictEqual(result.percentage, "100.00");
  quiz.restart();
  assert.strictEqual(quiz.getState().currentQuestionIndex, 0);
  assert.strictEqual(quiz.getState().correctAnswers, 0);
}

{
  const quiz = new QuizEngine(questions);
  questions.forEach((question, index) => {
    const [wrong1, wrong2] = wrongLetters(question);
    quiz.selectAnswer(wrong1);
    quiz.selectAnswer(wrong2);
    quiz.nextQuestion();
    if (index === questions.length - 1) assert.strictEqual(quiz.getState().quizCompleted, true);
  });
  const result = quiz.getResult();
  assert.strictEqual(result.correct, 0);
  assert.strictEqual(result.wrong, 320);
  assert.strictEqual(result.total, 320);
  assert.strictEqual(result.percentage, "0.00");
}

console.log("PASS: dữ liệu và toàn bộ nhánh logic QuizEngine.");
