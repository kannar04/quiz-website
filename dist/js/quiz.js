(function (global) {
  "use strict";

  class QuizEngine {
    constructor(questions) {
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Ngân hàng câu hỏi không hợp lệ.");
      }
      this.questions = questions;
      this.restart();
    }

    restart() {
      this.currentQuestionIndex = 0;
      this.correctAnswers = 0;
      this.attempts = 0;
      this.selectedWrongAnswers = [];
      this.questionCompleted = false;
      this.quizCompleted = false;
      return this.getState();
    }

    getCurrentQuestion() {
      return this.questions[this.currentQuestionIndex];
    }

    getState() {
      return {
        currentQuestionIndex: this.currentQuestionIndex,
        correctAnswers: this.correctAnswers,
        attempts: this.attempts,
        selectedWrongAnswers: [...this.selectedWrongAnswers],
        questionCompleted: this.questionCompleted,
        quizCompleted: this.quizCompleted,
      };
    }

    selectAnswer(letter) {
      const question = this.getCurrentQuestion();
      const isValidOption = question && Object.prototype.hasOwnProperty.call(question.options, letter);
      if (!isValidOption || this.questionCompleted || this.attempts >= 2 || this.selectedWrongAnswers.includes(letter)) {
        return { accepted: false, state: this.getState() };
      }

      this.attempts += 1;
      if (letter === question.answer) {
        this.questionCompleted = true;
        this.correctAnswers += 1;
        return { accepted: true, outcome: "correct", attempt: this.attempts, state: this.getState() };
      }

      this.selectedWrongAnswers.push(letter);
      if (this.attempts === 2) {
        this.questionCompleted = true;
        return { accepted: true, outcome: "exhausted", attempt: 2, state: this.getState() };
      }

      return { accepted: true, outcome: "retry", attempt: 1, state: this.getState() };
    }

    nextQuestion() {
      if (!this.questionCompleted) return { advanced: false, state: this.getState() };

      if (this.currentQuestionIndex === this.questions.length - 1) {
        this.quizCompleted = true;
        return { advanced: false, finished: true, state: this.getState() };
      }

      this.currentQuestionIndex += 1;
      this.attempts = 0;
      this.selectedWrongAnswers = [];
      this.questionCompleted = false;
      return { advanced: true, finished: false, state: this.getState() };
    }

    getResult() {
      const total = this.questions.length;
      return {
        correct: this.correctAnswers,
        wrong: total - this.correctAnswers,
        total,
        percentage: ((this.correctAnswers / total) * 100).toFixed(2),
      };
    }
  }

  global.QuizEngine = QuizEngine;
})(typeof window !== "undefined" ? window : globalThis);
