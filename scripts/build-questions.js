const fs = require("fs");
const path = require("path");

const sourcePath = path.resolve(__dirname, "../../ngan_hang_cau_hoi_thi_ket_thuc.md");
const outputPath = path.resolve(__dirname, "../js/questions.js");
const lines = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);

const questions = [];
let currentChapter = "";
let currentQuestion = null;

for (const line of lines) {
  if (/^## CHƯƠNG\s+/.test(line)) {
    currentChapter = line.replace(/^##\s+/, "").trim();
    continue;
  }

  const questionMatch = line.match(/^### Câu (\d+):\s*(.+?)\s*\(cấp độ\s*(\d+)\)\s*$/i);
  if (questionMatch) {
    currentQuestion = {
      id: Number(questionMatch[1]),
      question: questionMatch[2].trim(),
      options: {},
      answer: "",
      level: Number(questionMatch[3]),
      chapter: currentChapter,
      explanation: "",
    };
    questions.push(currentQuestion);
    continue;
  }

  const optionMatch = line.match(/^- ([A-D])\.\s*(.+)$/);
  if (optionMatch && currentQuestion) {
    currentQuestion.options[optionMatch[1]] = optionMatch[2].trim();
    continue;
  }

  const answerMatch = line.match(/^\*\*Đáp án:\s*([A-D])\*\*\s*$/i);
  if (answerMatch && currentQuestion) {
    currentQuestion.answer = answerMatch[1].toUpperCase();
  }
}

const errors = [];
if (questions.length !== 320) errors.push(`Cần 320 câu, nhận được ${questions.length}.`);

questions.forEach((question, index) => {
  const expectedId = index + 1;
  const optionKeys = Object.keys(question.options);
  if (question.id !== expectedId) errors.push(`Vị trí ${expectedId} có mã câu ${question.id}.`);
  if (!question.chapter) errors.push(`Câu ${question.id} thiếu chương.`);
  if (!Number.isInteger(question.level)) errors.push(`Câu ${question.id} thiếu cấp độ.`);
  if (optionKeys.join("") !== "ABCD") errors.push(`Câu ${question.id} không đủ A, B, C, D.`);
  if (!/^[A-D]$/.test(question.answer)) errors.push(`Câu ${question.id} có đáp án không hợp lệ.`);
  question.explanation = `Đáp án đúng theo ngân hàng câu hỏi là ${question.answer}. ${question.options[question.answer]}`;
});

if (errors.length) {
  throw new Error(`Không thể tạo dữ liệu:\n${errors.join("\n")}`);
}

const banner = "/* Tự động trích xuất từ ngan_hang_cau_hoi_thi_ket_thuc.md. Không chỉnh sửa thủ công. */\n";
const output = `${banner}window.QUESTIONS = ${JSON.stringify(questions, null, 2)};\n`;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output, "utf8");

console.log(`Đã tạo ${outputPath}`);
console.log(`Số câu: ${questions.length}; đáp án hợp lệ: ${questions.filter((q) => /^[A-D]$/.test(q.answer)).length}.`);
