export class CreateUserDto {
  email!: string;

  username!: string;

  nickname?: string;

  password!: string;

  confirmPassword!: string;
}
