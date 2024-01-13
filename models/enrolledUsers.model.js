import { model, Schema } from 'mongoose';

const enrolledUsersIyfaSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const enrolledUsersYlpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const EnrolledUsersIYFA = model('Enrolled_Users_IYFA', enrolledUsersIyfaSchema);
const EnrolledUsersYLP = model('Enrolled_Users_YLP', enrolledUsersYlpSchema);

export {
  EnrolledUsersIYFA,
  EnrolledUsersYLP
};