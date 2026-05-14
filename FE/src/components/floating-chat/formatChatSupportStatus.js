// Hàm này định dạng trạng thái hỗ trợ trò chuyện dựa trên đối tượng presence.
// Nó kiểm tra xem có người xem nào là quản trị viên không và trả về thông báo trạng thái phù hợp.
// Tham số:
// - presence: Đối tượng chứa thông tin người xem.
// Trả về:
// - Một chuỗi cho biết quản trị viên có đang online hay không.
export function formatChatSupportStatus(presence) {
  return presence?.viewers?.some((item) => item?.isAdmin)
    ? "Nhân viên đang online"
    : "Đang chờ nhân viên hỗ trợ";
}