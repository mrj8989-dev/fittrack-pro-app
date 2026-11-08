import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { AdminCreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Métricas globales de la plataforma' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Listar usuarios con filtros' })
  @ApiQuery({ name: 'role', enum: Role, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'trainerId', required: false })
  @ApiQuery({ name: 'active', required: false, enum: ['true', 'false'] })
  findUsers(
    @Query('role') role?: Role,
    @Query('search') search?: string,
    @Query('trainerId') trainerId?: string,
    @Query('active') active?: string,
  ) {
    return this.adminService.findUsers({
      role: role && Object.values(Role).includes(role) ? role : undefined,
      search,
      trainerId,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Detalle de un usuario' })
  findUser(@Param('id') id: string) {
    return this.adminService.findUser(id);
  }

  @Post('users')
  @ApiOperation({ summary: 'Dar de alta un usuario con cualquier rol' })
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  @ApiOperation({
    summary: 'Editar datos, rol, plan, entrenador o contraseña de un usuario',
  })
  updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() admin: { id: string },
  ) {
    return this.adminService.updateUser(id, dto, admin.id);
  }

  @Delete('users/:id')
  @ApiOperation({
    summary: 'Eliminar un usuario y todos sus datos (irreversible)',
  })
  deleteUser(@Param('id') id: string, @CurrentUser() admin: { id: string }) {
    return this.adminService.deleteUser(id, admin.id);
  }
}
