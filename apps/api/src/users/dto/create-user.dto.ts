// 회원 가입에 필요한 입력값을 전달한다.
export class CreateUserDto {
  email!: string;

  username!: string;

  nickname?: string;

  password!: string;

  confirmPassword!: string;
}
