import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
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

    // Crear el usuario en la BD
    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      role: dto.role,
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

    return this.generateToken(user);
  }

  private generateToken(user: { id: string; email: string; name: string; role: string; profilePhoto?: string | null }) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profilePhoto: user.profilePhoto ?? null,
      },
    };
  }
}