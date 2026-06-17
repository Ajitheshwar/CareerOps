// server/src/modules/interview/services/evaluation.service.ts
import { InterviewRepository } from '../repositories/interview.repository';
import { AnswerEvaluatorAgent } from '../agents/answer-evaluator.agent';
import { InterviewQuestion, InterviewEvaluation, QuestionFeedback } from '../models/interview-session.model';

export class EvaluationService {
  private static agent = new AnswerEvaluatorAgent();

  static async submitAnswer(
    sessionId: string,
    questionId: string,
    userAnswer: string,
    feedback: QuestionFeedback
  ): Promise<InterviewEvaluation> {
    const question = await InterviewRepository.getQuestionById(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    // 1. Run LLM evaluation agent
    const evaluation = await this.agent.evaluate(
      question.question,
      question.roundType,
      question.answerTemplate,
      userAnswer,
      feedback
    );

    // 2. Save userAnswer and evaluation to question document
    question.userAnswer = userAnswer;
    question.feedback = feedback;
    question.evaluation = evaluation;
    question.updatedAt = new Date();

    await InterviewRepository.saveQuestion(question);

    return evaluation;
  }

  static async submitSkip(sessionId: string, questionId: string): Promise<InterviewEvaluation> {
    const question = await InterviewRepository.getQuestionById(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    // 1. Compile skip educational contents using LLM
    const skipDetails = await this.agent.compileSkip(question.question, question.answerTemplate);

    const evaluation: InterviewEvaluation = {
      score: 0,
      depthScore: 0,
      confidenceScore: 0,
      communicationScore: 0,
      problemSolvingScore: 0,
      topicMasteryScore: 0,
      feedback: 'Question was skipped by candidate. Review the expected answer and learning cards below to strengthen your understanding.',
      expectedAnswer: skipDetails.expectedAnswer || question.answerTemplate,
      keyConcepts: skipDetails.keyConcepts || [],
      learningNotes: skipDetails.learningNotes || 'Review basic definitions and application parameters.',
      evaluatedAt: new Date()
    };

    // 2. Update question document
    question.isSkipped = true;
    question.userAnswer = null;
    question.evaluation = evaluation;
    question.updatedAt = new Date();

    await InterviewRepository.saveQuestion(question);

    return evaluation;
  }

  static async submitDontKnow(sessionId: string, questionId: string): Promise<InterviewEvaluation> {
    const question = await InterviewRepository.getQuestionById(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    // 1. Compile skip-like upskilling feedback for a registered knowledge gap
    const skipDetails = await this.agent.compileSkip(question.question, question.answerTemplate);

    const evaluation: InterviewEvaluation = {
      score: 0,
      depthScore: 0,
      confidenceScore: 0,
      communicationScore: 0,
      problemSolvingScore: 0,
      topicMasteryScore: 0,
      feedback: 'Registered as a knowledge gap. The adaptive engine has recorded this topic and will schedule simpler, foundational follow-ups.',
      expectedAnswer: skipDetails.expectedAnswer || question.answerTemplate,
      keyConcepts: skipDetails.keyConcepts || [],
      learningNotes: skipDetails.learningNotes || 'Look over core concepts and sample code blocks.',
      evaluatedAt: new Date()
    };

    // 2. Update question document
    question.isDontKnow = true;
    question.userAnswer = null;
    question.evaluation = evaluation;
    question.updatedAt = new Date();

    await InterviewRepository.saveQuestion(question);

    return evaluation;
  }
}
