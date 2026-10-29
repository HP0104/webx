import { Shield, Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
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
            <Sparkles size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--color-text-light)', fontWeight: 800 }}>
              Về Chúng Tôi - WEB18P
            </h1>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Nền tảng chia sẻ và lưu trữ Game Việt Hóa, Phim Bộ và Truyện Tranh hàng đầu
            </p>
          </div>
        </div>

        <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '1.5rem 0' }} />

        <div style={{ lineHeight: 1.8, fontSize: '0.95rem', color: 'rgba(255,255,255,0.88)' }}>
          <h2 style={{ fontSize: '1.3rem', color: 'var(--color-accent)', marginTop: '1.5rem', marginBottom: '0.6rem' }}>
            1. Sứ Mệnh & Tầm Nhìn
          </h2>
          <p>
            Được thành lập từ niềm đam mê với văn hóa game và giải trí đa phương tiện, <strong>WEB18P (web18p.xyz)</strong> ra đời với sứ mệnh mang đến cho cộng đồng người dùng Việt Nam một không gian tổng hợp thông tin, link tải an toàn và các tác phẩm game được bản địa hóa tiếng Việt (Game Việt Hóa) đạt chuẩn chất lượng cao nhất.
          </p>
          <p>
            Chúng tôi hiểu rằng rào cản ngôn ngữ là một trong những trở ngại lớn nhất khiến người chơi khó tiếp cận và thấu cảm trọn vẹn cốt truyện của các tựa game quốc tế. Vì vậy, WEB18P liên tục hợp tác, sưu tầm và hỗ trợ các nhóm dịch thuật độc lập, mang lại những bản dịch chỉn chu, mượt mà và dễ hiểu cho game thủ trên cả hai nền tảng PC và Android.
          </p>

          <h2 style={{ fontSize: '1.3rem', color: 'var(--color-accent)', marginTop: '2rem', marginBottom: '0.6rem' }}>
            2. Cam Kết Về An Toàn & Chất Lượng Nội Dung
          </h2>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li style={{ marginBottom: '0.6rem' }}>
              <strong>Kiểm tra bảo mật nghiêm ngặt:</strong> 100% các file cài đặt và link tải được chia sẻ trên hệ thống đều được kiểm tra kỹ lưỡng qua các công cụ quét mã độc (VirusTotal, Windows Defender) nhằm đảm bảo an toàn tuyệt đối cho thiết bị của bạn.
            </li>
            <li style={{ marginBottom: '0.6rem' }}>
              <strong>Hạ tầng truyền tải tốc độ cao:</strong> Máy chủ lưu trữ tối ưu hóa thông qua mạng phân phối nội dung (CDN) quốc tế và dịch vụ lưu trữ StreamHG chuyên dụng, giúp tốc độ tải xuống và xem trực tuyến luôn đạt mức tối đa.
            </li>
            <li style={{ marginBottom: '0.6rem' }}>
              <strong>Đột phá trải nghiệm xem:</strong> Tính năng xem phim bộ liên tiếp không ngắt quãng (Gapless Double-Buffering Streaming) độc quyền, giúp người xem thưởng thức các tập phim liền mạch không gián đoạn.
            </li>
          </ul>

          <h2 style={{ fontSize: '1.3rem', color: 'var(--color-accent)', marginTop: '2rem', marginBottom: '0.6rem' }}>
            3. Trách Nhiệm Cộng Đồng & Tôn Trọng Bản Quyền (DMCA)
          </h2>
          <p>
            WEB18P luôn tôn trọng quyền sở hữu trí tuệ của các nhà phát triển và đơn vị giữ bản quyền. Nền tảng hoạt động như một chỉ mục thông tin phi lợi nhuận phục vụ mục đích trải nghiệm và đánh giá của cộng đồng người hâm mộ. Chúng tôi sẵn sàng hợp tác gỡ bỏ bất kỳ nội dung nào khi nhận được yêu cầu hợp lệ từ chủ sở hữu thông qua trang <Link to="/report" style={{ color: 'var(--color-accent)' }}>Báo Cáo</Link> hoặc email <code style={{ color: '#00d2d3' }}>contact@web18p.xyz</code>.
          </p>

          <div style={{ marginTop: '2.5rem', padding: '1.25rem', backgroundColor: 'rgba(102, 192, 244, 0.08)', borderRadius: '10px', border: '1px solid rgba(102, 192, 244, 0.25)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Shield size={28} color="var(--color-accent)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-text-light)', marginBottom: '0.2rem' }}>Thông Tin Xác Thực Website</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Tên miền chính thức: <strong>web18p.xyz</strong> | Quốc gia: Việt Nam | Hỗ trợ: contact@web18p.xyz
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
