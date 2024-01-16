import nodemailer from "nodemailer";

// async..await is not allowed in global scope, must use a wrapper
const sendEmail = async function (email, subject, message) {
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_MAIL_USERNAME,
      pass: process.env.SMTP_MAIL_PASSWORD,
    }
  });

  // send mail with defined transport object
  await transporter.sendMail({
    from: process.env.SMTP_FROM_EMAIL, // sender address
    to: email, // user email
    subject: subject, // Subject line
    text: message, // text
  });
};

export default sendEmail;