export function formatChatSupportStatus(presence) {
  return presence?.viewers?.some((item) => item?.isAdmin)
    ? "Nhân viên đang online"
    : "Đang chờ nhân viên hỗ trợ";
}