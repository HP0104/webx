import { Shield, Lock, Eye, Database, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="container" style={{ padding: '2rem 1rem 5rem', maxWidth: '960px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Quay lại trang chủ
        </Link>
      </div>

      <div className="card" style={{ padding: '2.5rem 2rem', borderRadius: '14px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(102, 192, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
            <Shield size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--color-text-light)', fontWeight: 800 }}>
              Chính Sách Quyền Riêng Tư & Bảo Mật Dữ Liệu
            </h1>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Cập nhật lần cuối: Tháng 10/2026 | Áp dụng cho toàn bộ người dùng tại WEB18P (web18p.xyz)
            </p>
          </div>
        </div>

        <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '1.5rem 0' }} />

        <div style={{ lineHeight: 1.8, fontSize: '0.95rem', color: 'rgba(255,255,255,0.88)' }}>
          <p>
            Chào mừng bạn đến với <strong>WEB18P</strong>. Chúng tôi cam kết tuyệt đối tôn trọng và bảo vệ quyền riêng tư cá nhân của người dùng khi truy cập, tìm kiếm game, xem video hoặc sử dụng bất kỳ dịch vụ nào trên trang web <code>https://web18p.xyz</code>. Chính sách này giải thích minh bạch cách thức chúng tôi thu thập, lưu trữ, sử dụng và bảo mật dữ liệu của bạn.
          </p>

          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-accent)', marginTop: '1.8rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={20} /> 1. Dữ Liệu Chúng Tôi Thu Thập
          </h2>
          <p>
            Để vận hành dịch vụ ổn định và cung cấp trải nghiệm giải trí tốt nhất, chúng tôi chỉ thu thập các thông tin tối thiểu cần thiết:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
            <li>
              <strong>Thông tin tài khoản:</strong> Khi bạn đăng ký hoặc đăng nhập thông qua Firebase Authentication (Email hoặc Google Sign-In), hệ thống ghi nhận địa chỉ email, tên hiển thị công khai và ảnh đại diện do bạn cung cấp.
            </li>
            <li>
              <strong>Dữ liệu hoạt động giải trí:</strong> Lịch sử danh sách yêu thích, bình luận đánh giá game/phim, tiến độ phát video liên tục và cài đặt giao diện (giao diện sáng/tối).
            </li>
            <li>
              <strong>Thông tin kỹ thuật ẩn danh:</strong> Địa chỉ IP ẩn danh, loại trình duyệt, hệ điều hành thiết bị và thời gian truy cập nhằm mục đích ngăn chặn tấn công từ chối dịch vụ (DDoS) và phân tích hiệu năng tải trang.
            </li>
          </ul>

          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-accent)', marginTop: '1.8rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={20} /> 2. Cookie và Công Nghệ Lưu Trữ Cục Bộ (Local Storage)
          </h2>
          <p>
            WEB18P sử dụng Cookie kỹ thuật và HTML5 Local Storage để ghi nhớ trạng thái phiên làm việc của bạn:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
            <li>
              <strong>Phiên xác thực:</strong> Lưu giữ token đăng nhập bảo mật để bạn không phải nhập mật khẩu mỗi lần chuyển trang.
            </li>
            <li>
              <strong>Trình phát video liên tiếp:</strong> Lưu lại tập phim đang xem và mốc thời gian để người dùng có thể tiếp tục xem phim liền mạch mà không bị mất dấu.
            </li>
            <li>
              Chúng tôi <em>không</em> sử dụng cookie của bên thứ ba để theo dõi hành vi xuyên suốt các website khác hoặc bán dữ liệu cá nhân cho các mạng lưới quảng cáo phiền toái.
            </li>
          </ul>

          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-accent)', marginTop: '1.8rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={20} /> 3. An Toàn & Bảo Mật Thông Tin
          </h2>
          <p>
            Toàn bộ lưu lượng truy cập giữa trình duyệt của bạn và máy chủ WEB18P đều được mã hóa bằng giao thức HTTPS/TLS 1.3 tiêu chuẩn quân sự thông qua mạng Cloudflare. Dữ liệu tài khoản người dùng được lưu trữ an toàn trên hạ tầng đám mây Google Cloud Firestore với các lớp phân quyền truy cập nghiêm ngặt. Chúng tôi áp dụng quy tắc mã hóa một chiều đối với các thông tin nhạy cảm và không lưu trữ mật khẩu dưới dạng văn bản thuần (plain text).
          </p>

          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-accent)', marginTop: '1.8rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} /> 4. Quyền Hạn Của Người Dùng Đối Với Dữ Liệu Cá Nhân
          </h2>
          <p>
            Bạn có toàn quyền kiểm soát dữ liệu cá nhân của mình trên hệ thống WEB18P:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
            <li>Quyền xem, tra cứu và chỉnh sửa thông tin hồ sơ tài khoản bất kỳ lúc nào.</li>
            <li>Quyền yêu cầu xóa vĩnh viễn toàn bộ tài khoản, bình luận và dữ liệu liên quan khỏi cơ sở dữ liệu của chúng tôi.</li>
            <li>Quyền từ chối các thông báo hệ thống và hủy theo dõi các bài viết đã lưu.</li>
          </ul>

          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-accent)', marginTop: '1.8rem', marginBottom: '0.6rem' }}>
            5. Liên Hệ Bộ Phận Phụ Trách Quyền Riêng Tư
          </h2>
          <p>
            Nếu bạn có bất kỳ câu hỏi nào về chính sách quyền riêng tư hoặc muốn gửi yêu cầu xuất/xóa dữ liệu, vui lòng liên hệ trực tiếp với chúng tôi qua email: <a href="mailto:privacy@web18p.xyz" style={{ color: 'var(--color-accent)' }}>privacy@web18p.xyz</a> hoặc qua trang <Link to="/contact" style={{ color: 'var(--color-accent)' }}>Liên Hệ</Link>. Chúng tôi sẽ phản hồi trong vòng tối đa 48 giờ làm việc.
          </p>
        </div>
      </div>
    </div>
  );
}

