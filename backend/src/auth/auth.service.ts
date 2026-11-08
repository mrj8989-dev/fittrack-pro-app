import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Verificar si el email ya existe
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hashear la contraseña antes de guardarla
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Crear el usuario en la BD. El registro público siempre crea CLIENT;
    // entrenadores y admins los da de alta un admin desde /admin/users.
    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
    });

    // Generar y devolver el token
    return this.generateToken(user);
  }

  async login(dto: LoginDto) {
    // Buscar el usuario por email
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Verificar la contraseña
    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Solo se informa de la desactivación a quien conoce la contraseña.
    if (!user.active) {
      throw new ForbiddenException(
        'Tu cuenta está desactivada. Contacta con el administrador.',
      );
    }

    const updated = await this.usersService.touchLastLogin(user.id);
    return this.generateToken(updated);
  }

  /** Datos públicos del usuario autenticado (para refrescar plan, rol o foto sin volver a entrar). */
  me(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    profilePhoto?: string | null;
    mustChangePassword?: boolean;
    subscriptionPlan?: string;
  }) {
    return this.generateToken(user).user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid)
      throw new BadRequestException('La contraseña actual no es correcta');
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta de la actual',
      );
    }

    const updated = await this.usersService.setPassword(
      userId,
      await bcrypt.hash(dto.newPassword, 10),
    );
    return this.generateToken(updated);
  }

  private generateToken(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    profilePhoto?: string | null;
    mustChangePassword?: boolean;
    subscriptionPlan?: string;
  }) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profilePhoto: user.profilePhoto ?? null,
        mustChangePassword: user.mustChangePassword ?? false,
        subscriptionPlan: user.subscriptionPlan ?? null,
      },
    };
  }
}
