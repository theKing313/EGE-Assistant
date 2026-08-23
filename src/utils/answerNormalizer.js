export function checkAnswer(userAnswer, correctAnswer) {
  const user = normalize(userAnswer);
  const correct = normalize(correctAnswer);

  if (user === correct) {
    return "correct";
  }

  if (isPartial(user, correct)) {
    return "partial";
  }

  return "wrong";
}
