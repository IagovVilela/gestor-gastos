import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Metas')
@ApiBearerAuth()
@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova meta' })
  @ApiResponse({ status: 201, description: 'Meta criada com sucesso' })
  create(@CurrentUser() user: { id: string }, @Body() createGoalDto: CreateGoalDto) {
    return this.goalsService.create(user.id, createGoalDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as metas do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de metas' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.goalsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter meta por ID' })
  @ApiResponse({ status: 200, description: 'Meta encontrada' })
  @ApiResponse({ status: 404, description: 'Meta não encontrada' })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.goalsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar meta' })
  @ApiResponse({ status: 200, description: 'Meta atualizada com sucesso' })
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateGoalDto: UpdateGoalDto,
  ) {
    return this.goalsService.update(id, user.id, updateGoalDto);
  }

  @Post(':id/calculate-progress')
  @ApiOperation({ summary: 'Calcular progresso da meta' })
  @ApiResponse({ status: 200, description: 'Progresso calculado' })
  calculateProgress(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.goalsService.calculateProgress(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar meta' })
  @ApiResponse({ status: 200, description: 'Meta deletada com sucesso' })
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.goalsService.remove(id, user.id);
  }
}


