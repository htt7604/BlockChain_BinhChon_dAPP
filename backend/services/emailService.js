const nodemailer = require('nodemailer');

// Cấu hình email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'hophuocloi2004@gmail.com',
    pass: process.env.EMAIL_PASS || 'yfti cerx ksfb ffdz'
  }
});

// Hàm gửi email OTP
const sendOTPEmail = async (email, otpCode, userName) => {
  try {
    const mailOptions = {
      from: `"Hệ Thống Bình Chọn" <${process.env.EMAIL_USER || 'hophuocloi2004@gmail.com'}>`,
      to: email,
      subject: 'Mã OTP xác thực đăng ký tài khoản',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa;">
          <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #667eea; margin: 0;">HỆ THỐNG BÌNH CHỌN</h1>
              <p style="color: #666; margin: 5px 0;">Trường Đại Học</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <h2 style="color: white; margin: 0 0 10px 0;">Mã xác thực OTP</h2>
              <p style="color: white; margin: 0; font-size: 14px;">Xin chào ${userName || 'bạn'}</p>
            </div>
            
            <div style="background-color: #f0f4ff; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <p style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Mã OTP của bạn là:</p>
              <div style="background-color: white; padding: 15px; border-radius: 8px; display: inline-block; border: 2px solid #667eea;">
                <h1 style="color: #667eea; margin: 0; font-size: 32px; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                  ${otpCode}
                </h1>
              </div>
              <p style="color: #999; margin: 15px 0 0 0; font-size: 12px;">Mã này có hiệu lực trong 10 phút</p>
            </div>
            
            <div style="border-top: 2px solid #f0f0f0; padding-top: 20px;">
              <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.6;">
                <strong>Lưu ý:</strong><br>
                - Không chia sẻ mã OTP này với bất kỳ ai<br>
                - Mã OTP chỉ sử dụng một lần<br>
                - Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f0f0f0; text-align: center;">
              <p style="color: #999; margin: 0; font-size: 12px;">
                Email này được gửi tự động, vui lòng không trả lời.
              </p>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email OTP đã được gửi đến:', email);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Lỗi khi gửi email OTP:', error);
    throw new Error('Không thể gửi email OTP. Vui lòng thử lại sau.');
  }
};

// Hàm tạo mã OTP ngẫu nhiên 6 chữ số
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = {
  sendOTPEmail,
  generateOTP
};

