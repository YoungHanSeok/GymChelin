// 현재 비밀번호 확인이 필요한 비밀번호 변경 요청을 전달한다.
export class ChangePasswordDto {
  currentPassword!: string;

  newPassword!: string;

  confirmNewPassword!: string;
}
